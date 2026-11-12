import asyncio
import json
import time
from dataclasses import dataclass
from datetime import timedelta, timezone
from typing import AsyncGenerator, Optional
from uuid import UUID

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.models.models import Attachment, Conversation, Message, UserPreference, utcnow
from app.schemas.chat import ChatStreamRequest, EditResendRequest, RegenerateRequest
from app.services.chat_history_service import (
    create_conversation,
    get_conversation,
    truncate_messages_after,
)
from app.services.file_processing_service import attachment_to_image_data_uri
from app.services.llm_provider_service import (
    ChatMessagePayload,
    ProviderAPIError,
    ProviderNotConfiguredError,
    stream_chat_completion,
)
from app.services.rate_limit_service import check_user_limits, record_usage
from app.services.user_settings_service import get_or_create_preferences
from app.schemas.chat import ConversationCreate

logger = get_logger("ai_conversation")


def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _build_system_prompt(pref: UserPreference, language_override: Optional[str]) -> str:
    lang = language_override or pref.preferred_language or "auto"
    lang_rule = (
        "Respond in the exact language used by the user (supports Hindi/हिन्दी, English, Hinglish, and other languages naturally)."
        if lang == "auto"
        else f"Respond primarily in '{lang}' unless the user explicitly asks for another language."
    )

    parts = [
        "You are SURaj AI, a helpful, accurate, and thoughtful multimodal AI assistant.",
        lang_rule,
        "Guidelines:",
        "- Understand user intent carefully and structure answers with clean GitHub-flavored Markdown (headings, tables, bullet lists, LaTeX math with `$...$` or `$$...$$`).",
        "- Explain complex topics step by step and provide well-commented code with clear explanations.",
        "- When a flowchart, architecture diagram, or sequence diagram is useful, output a fenced `mermaid` code block.",
        "- When visualizing quantitative data or creating an interactive chart, you may output a fenced `chart` JSON block formatted as: "
        '`{"type":"bar|line|area|pie","title":"...","xKey":"label","series":["value"],"data":[{"label":"A","value":10}]}`.',
        "- Admit uncertainty when information is missing or unverifiable. Never fabricate citations, URLs, statistics, or file contents.",
    ]
    if pref.system_instructions and pref.system_instructions.strip():
        parts.append(f"User custom instructions:\n{pref.system_instructions.strip()}")
    return "\n".join(parts)


def _derive_title(content: str) -> str:
    cleaned = " ".join(content.strip().split())
    if not cleaned:
        return "New Conversation"
    return cleaned[:56] + ("..." if len(cleaned) > 56 else "")


async def _attach_files_to_message(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
    message_id: UUID,
    attachment_ids: list[UUID],
) -> list[Attachment]:
    if not attachment_ids:
        return []
    result = await db.execute(
        select(Attachment).where(
            Attachment.id.in_(attachment_ids),
            Attachment.user_id == user_id,
        )
    )
    attachments = list(result.scalars().all())
    for att in attachments:
        att.conversation_id = conversation_id
        att.message_id = message_id
    await db.commit()
    return attachments


def _build_llm_messages(
    system_prompt: str, history_messages: list[Message]
) -> list[ChatMessagePayload]:
    payloads: list[ChatMessagePayload] = [ChatMessagePayload(role="system", text=system_prompt)]
    for msg in history_messages[-24:]:
        if msg.role not in ("user", "assistant"):
            continue
        if msg.status == "error" and msg.role == "assistant" and not msg.content.strip():
            continue

        text_parts = [msg.content]
        images: list[tuple[str, str]] = []
        for att in msg.attachments:
            if att.kind == "image":
                img_tuple = attachment_to_image_data_uri(att)
                if img_tuple:
                    images.append(img_tuple)
                text_parts.append(f"[Attached image: {att.filename}]")
            elif att.extracted_text:
                excerpt = att.extracted_text[:12000]
                text_parts.append(
                    f"[Attached {att.kind.upper()} file '{att.filename}']\n{excerpt}"
                )
        payloads.append(
            ChatMessagePayload(
                role=msg.role,
                text="\n\n".join(text_parts),
                images=images,
            )
        )
    return payloads


@dataclass
class PreparedStreamContext:
    user_id: UUID
    conversation_id: UUID
    conversation_title: str
    user_message_id: Optional[UUID]
    assistant_message_id: UUID
    provider: str
    model: str
    temperature: float
    preferred_language: str
    system_instructions: Optional[str]
    language_override: Optional[str]


async def prepare_new_turn(
    db: AsyncSession,
    *,
    user_id: UUID,
    payload: ChatStreamRequest,
) -> PreparedStreamContext:
    await check_user_limits(db, user_id)
    pref = await get_or_create_preferences(db, user_id)
    settings = get_settings()

    provider = (payload.provider or pref.default_provider or settings.DEFAULT_LLM_PROVIDER).lower()
    model = payload.model or pref.default_model or settings.DEFAULT_LLM_MODEL
    temperature = payload.temperature if payload.temperature is not None else pref.temperature

    if payload.conversation_id:
        conv = await get_conversation(db, user_id, payload.conversation_id, include_messages=False)
        conv.provider = provider
        conv.model = model
    else:
        conv = await create_conversation(
            db,
            user_id,
            ConversationCreate(
                title=_derive_title(payload.content),
                provider=provider,
                model=model,
            ),
        )

    user_ts = utcnow()
    user_msg = Message(
        conversation_id=conv.id,
        user_id=user_id,
        role="user",
        content=payload.content,
        provider=provider,
        model=model,
        status="completed",
        created_at=user_ts,
        updated_at=user_ts,
    )
    db.add(user_msg)
    await db.flush()

    await _attach_files_to_message(
        db,
        user_id=user_id,
        conversation_id=conv.id,
        message_id=user_msg.id,
        attachment_ids=payload.attachment_ids,
    )

    if conv.title == "New Conversation":
        conv.title = _derive_title(payload.content)

    ai_ts = max(utcnow(), user_ts + timedelta(microseconds=1))
    assistant_msg = Message(
        conversation_id=conv.id,
        user_id=user_id,
        role="assistant",
        content="",
        provider=provider,
        model=model,
        status="streaming",
        created_at=ai_ts,
        updated_at=ai_ts,
    )
    db.add(assistant_msg)
    await db.commit()

    return PreparedStreamContext(
        user_id=user_id,
        conversation_id=conv.id,
        conversation_title=conv.title,
        user_message_id=user_msg.id,
        assistant_message_id=assistant_msg.id,
        provider=provider,
        model=model,
        temperature=temperature,
        preferred_language=pref.preferred_language,
        system_instructions=pref.system_instructions,
        language_override=payload.language,
    )


async def prepare_edit_and_resend(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
    message_id: UUID,
    payload: EditResendRequest,
) -> PreparedStreamContext:
    await check_user_limits(db, user_id)
    conv = await get_conversation(db, user_id, conversation_id, include_messages=False)
    pref = await get_or_create_preferences(db, user_id)

    res = await db.execute(
        select(Message).where(
            Message.id == message_id,
            Message.conversation_id == conversation_id,
            Message.user_id == user_id,
        )
    )
    target_msg = res.scalar_one_or_none()
    if target_msg is None or target_msg.role != "user":
        raise HTTPException(status_code=404, detail="User message not found in conversation.")

    await truncate_messages_after(db, conversation_id, target_msg, inclusive=False)

    provider = (payload.provider or conv.provider or pref.default_provider).lower()
    model = payload.model or conv.model or pref.default_model
    target_msg.content = payload.content
    target_msg.provider = provider
    target_msg.model = model
    if payload.attachment_ids:
        await _attach_files_to_message(
            db,
            user_id=user_id,
            conversation_id=conversation_id,
            message_id=target_msg.id,
            attachment_ids=payload.attachment_ids,
        )

    target_created = (
        target_msg.created_at
        if target_msg.created_at.tzinfo is not None
        else target_msg.created_at.replace(tzinfo=timezone.utc)
    )
    ai_ts = max(utcnow(), target_created + timedelta(microseconds=1))
    assistant_msg = Message(
        conversation_id=conv.id,
        user_id=user_id,
        role="assistant",
        content="",
        provider=provider,
        model=model,
        status="streaming",
        created_at=ai_ts,
        updated_at=ai_ts,
    )
    db.add(assistant_msg)
    await db.commit()

    return PreparedStreamContext(
        user_id=user_id,
        conversation_id=conv.id,
        conversation_title=conv.title,
        user_message_id=target_msg.id,
        assistant_message_id=assistant_msg.id,
        provider=provider,
        model=model,
        temperature=pref.temperature,
        preferred_language=pref.preferred_language,
        system_instructions=pref.system_instructions,
        language_override=None,
    )


async def prepare_regenerate(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
    message_id: UUID,
    payload: RegenerateRequest,
) -> PreparedStreamContext:
    await check_user_limits(db, user_id)
    conv = await get_conversation(db, user_id, conversation_id, include_messages=False)
    pref = await get_or_create_preferences(db, user_id)

    res = await db.execute(
        select(Message).where(
            Message.id == message_id,
            Message.conversation_id == conversation_id,
            Message.user_id == user_id,
        )
    )
    target_msg = res.scalar_one_or_none()
    if target_msg is None or target_msg.role != "assistant":
        raise HTTPException(status_code=404, detail="Assistant message not found.")

    await truncate_messages_after(db, conversation_id, target_msg, inclusive=True)

    provider = (payload.provider or conv.provider or pref.default_provider).lower()
    model = payload.model or conv.model or pref.default_model

    assistant_msg = Message(
        conversation_id=conv.id,
        user_id=user_id,
        role="assistant",
        content="",
        provider=provider,
        model=model,
        status="streaming",
    )
    db.add(assistant_msg)
    await db.commit()

    return PreparedStreamContext(
        user_id=user_id,
        conversation_id=conv.id,
        conversation_title=conv.title,
        user_message_id=None,
        assistant_message_id=assistant_msg.id,
        provider=provider,
        model=model,
        temperature=pref.temperature,
        preferred_language=pref.preferred_language,
        system_instructions=pref.system_instructions,
        language_override=None,
    )


def _build_system_prompt_from_values(
    preferred_language: str, system_instructions: Optional[str], language_override: Optional[str]
) -> str:
    lang = language_override or preferred_language or "auto"
    lang_rule = (
        "Respond in the exact language used by the user (supports Hindi/हिन्दी, English, Hinglish, and other languages naturally)."
        if lang == "auto"
        else f"Respond primarily in '{lang}' unless the user explicitly asks for another language."
    )

    parts = [
        "You are SURaj AI, a helpful, accurate, and thoughtful multimodal AI assistant.",
        lang_rule,
        "Guidelines:",
        "- Understand user intent carefully and structure answers with clean GitHub-flavored Markdown (headings, tables, bullet lists, LaTeX math with `$...$` or `$$...$$`).",
        "- Explain complex topics step by step and provide well-commented code with clear explanations.",
        "- When a flowchart, architecture diagram, or sequence diagram is useful, output a fenced `mermaid` code block.",
        "- When visualizing quantitative data or creating an interactive chart, you may output a fenced `chart` JSON block formatted as: "
        '`{"type":"bar|line|area|pie","title":"...","xKey":"label","series":["value"],"data":[{"label":"A","value":10}]}`.',
        "- Admit uncertainty when information is missing or unverifiable. Never fabricate citations, URLs, statistics, or file contents.",
    ]
    if system_instructions and system_instructions.strip():
        parts.append(f"User custom instructions:\n{system_instructions.strip()}")
    return "\n".join(parts)


async def execute_prepared_stream(
    request: Request,
    ctx: PreparedStreamContext,
) -> AsyncGenerator[str, None]:
    yield _sse_event(
        "meta",
        {
            "conversation_id": str(ctx.conversation_id),
            "title": ctx.conversation_title,
            "user_message_id": str(ctx.user_message_id) if ctx.user_message_id else None,
            "assistant_message_id": str(ctx.assistant_message_id),
            "provider": ctx.provider,
            "model": ctx.model,
        },
    )

    start_ts = time.perf_counter()
    accumulated: list[str] = []
    prompt_tokens = 0
    completion_tokens = 0
    total_tokens = 0
    final_status = "completed"
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    required_env_var: Optional[str] = None

    try:
        async with AsyncSessionLocal() as session:
            hist_q = await session.execute(
                select(Message)
                .where(
                    Message.conversation_id == ctx.conversation_id,
                    Message.id != ctx.assistant_message_id,
                )
                .options(selectinload(Message.attachments))
                .order_by(Message.created_at.asc(), Message.id.asc())
            )
            history = list(hist_q.scalars().all())
            system_prompt = _build_system_prompt_from_values(
                ctx.preferred_language, ctx.system_instructions, ctx.language_override
            )
            llm_messages = _build_llm_messages(system_prompt, history)

        async for chunk in stream_chat_completion(
            provider=ctx.provider,
            model=ctx.model,
            messages=llm_messages,
            temperature=ctx.temperature,
        ):
            if await request.is_disconnected():
                final_status = "stopped"
                break
            if chunk.delta:
                accumulated.append(chunk.delta)
                yield _sse_event("delta", {"text": chunk.delta})
            if chunk.done:
                prompt_tokens = chunk.prompt_tokens
                completion_tokens = chunk.completion_tokens
                total_tokens = chunk.total_tokens

    except ProviderNotConfiguredError as exc:
        final_status = "error"
        error_message = str(exc)
        error_code = "API_KEY_NOT_CONFIGURED"
        required_env_var = exc.env_var
        yield _sse_event(
            "error",
            {
                "code": error_code,
                "provider": exc.provider,
                "required_env_var": exc.env_var,
                "message": error_message,
                "assistant_message_id": str(ctx.assistant_message_id),
            },
        )
    except ProviderAPIError as exc:
        final_status = "error"
        error_message = str(exc)
        error_code = "PROVIDER_API_ERROR"
        yield _sse_event(
            "error",
            {
                "code": error_code,
                "provider": exc.provider,
                "message": error_message,
                "assistant_message_id": str(ctx.assistant_message_id),
            },
        )
    except asyncio.CancelledError:
        final_status = "stopped"
    except Exception:
        logger.exception("Unexpected error during chat stream")
        final_status = "error"
        error_code = "INTERNAL_ERROR"
        error_message = "Unexpected backend error during response generation."
        yield _sse_event(
            "error",
            {
                "code": error_code,
                "message": error_message,
                "assistant_message_id": str(ctx.assistant_message_id),
            },
        )

    full_text = "".join(accumulated)
    latency_ms = int((time.perf_counter() - start_ts) * 1000)

    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Message).where(Message.id == ctx.assistant_message_id))
        msg = res.scalar_one_or_none()
        if msg is not None:
            msg.content = full_text
            msg.status = final_status
            msg.error_message = error_message
            msg.token_count = total_tokens or completion_tokens
            meta: dict[str, object] = {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "latency_ms": latency_ms,
            }
            if error_code:
                meta["error_code"] = error_code
            if required_env_var:
                meta["required_env_var"] = required_env_var
            msg.metadata_json = meta
            conv_res = await session.execute(
                select(Conversation).where(Conversation.id == ctx.conversation_id)
            )
            if conv_obj := conv_res.scalar_one_or_none():
                conv_obj.updated_at = utcnow()
            await session.commit()

        await record_usage(
            session,
            user_id=ctx.user_id,
            conversation_id=ctx.conversation_id,
            action_type="chat_completion",
            provider=ctx.provider,
            model=ctx.model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=latency_ms,
            status_value=final_status,
        )

    if final_status in ("completed", "stopped"):
        yield _sse_event(
            "done",
            {
                "assistant_message_id": str(ctx.assistant_message_id),
                "conversation_id": str(ctx.conversation_id),
                "status": final_status,
                "usage": {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens,
                    "latency_ms": latency_ms,
                },
            },
        )

