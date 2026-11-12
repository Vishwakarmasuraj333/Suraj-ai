from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.models import Attachment, Conversation, Message
from app.schemas.chat import ConversationCreate, ConversationUpdate


async def create_conversation(
    db: AsyncSession, user_id: UUID, payload: ConversationCreate
) -> Conversation:
    settings = get_settings()
    conv = Conversation(
        user_id=user_id,
        title=(payload.title or "New Conversation").strip()[:255],
        provider=payload.provider or settings.DEFAULT_LLM_PROVIDER,
        model=payload.model or settings.DEFAULT_LLM_MODEL,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


async def list_conversations(
    db: AsyncSession, user_id: UUID, query: Optional[str] = None, limit: int = 50
) -> list[Conversation]:
    stmt = select(Conversation).where(Conversation.user_id == user_id)
    if query and query.strip():
        q = f"%{query.strip()}%"
        matching_msg_convs = select(Message.conversation_id).where(
            Message.user_id == user_id,
            Message.content.ilike(q),
        )
        stmt = stmt.where(
            or_(
                Conversation.title.ilike(q),
                Conversation.id.in_(matching_msg_convs),
            )
        )
    stmt = stmt.order_by(Conversation.is_pinned.desc(), Conversation.updated_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_conversation(
    db: AsyncSession, user_id: UUID, conversation_id: UUID, include_messages: bool = True
) -> Conversation:
    stmt = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id,
    )
    if include_messages:
        stmt = stmt.options(
            selectinload(Conversation.messages).selectinload(Message.attachments)
        )
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )
    return conv


async def update_conversation(
    db: AsyncSession, user_id: UUID, conversation_id: UUID, payload: ConversationUpdate
) -> Conversation:
    conv = await get_conversation(db, user_id, conversation_id, include_messages=False)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(conv, field, value)
    await db.commit()
    await db.refresh(conv)
    return conv


async def delete_conversation(db: AsyncSession, user_id: UUID, conversation_id: UUID) -> None:
    conv = await get_conversation(db, user_id, conversation_id, include_messages=False)
    await db.delete(conv)
    await db.commit()


async def truncate_messages_after(
    db: AsyncSession, conversation_id: UUID, anchor_message: Message, inclusive: bool = False
) -> None:
    res = await db.execute(
        select(Message.id)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc(), Message.id.asc())
    )
    ordered_ids = [row[0] for row in res.all()]
    if anchor_message.id not in ordered_ids:
        return
    idx = ordered_ids.index(anchor_message.id)
    ids_to_delete = ordered_ids[idx:] if inclusive else ordered_ids[idx + 1 :]
    if not ids_to_delete:
        return

    # Clear attachment references explicitly for SQLite compatibility when PRAGMA foreign_keys is OFF
    await db.execute(
        update(Attachment)
        .where(Attachment.message_id.in_(ids_to_delete))
        .values(message_id=None)
    )
    await db.execute(delete(Message).where(Message.id.in_(ids_to_delete)))
    await db.commit()

