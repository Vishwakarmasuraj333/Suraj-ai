import base64
import time
import uuid
from pathlib import Path
from typing import Optional
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.models import Attachment, Conversation
from app.schemas.chat import ImageGenerateRequest, ImageGenerateResponse
from app.services.llm_provider_service import ProviderAPIError, ProviderNotConfiguredError
from app.services.rate_limit_service import record_usage
from app.services.safety_service import enforce_content_safety


def get_image_provider_capabilities() -> list[dict[str, str | bool]]:
    settings = get_settings()
    return [
        {
            "id": "openai",
            "name": "OpenAI DALL-E 3 / GPT Image",
            "configured": bool(settings.OPENAI_API_KEY.strip()),
            "required_env_var": "OPENAI_API_KEY",
            "default_model": "dall-e-3",
        },
        {
            "id": "gemini",
            "name": "Google Imagen 3 (Gemini API)",
            "configured": bool(settings.GEMINI_API_KEY.strip()),
            "required_env_var": "GEMINI_API_KEY",
            "default_model": "imagen-3.0-generate-002",
        },
    ]


async def generate_image(
    db: AsyncSession,
    *,
    user_id: UUID,
    payload: ImageGenerateRequest,
) -> ImageGenerateResponse:
    enforce_content_safety(payload.prompt)
    settings = get_settings()
    if payload.conversation_id is not None:
        conv_check = await db.execute(
            select(Conversation.id).where(
                Conversation.id == payload.conversation_id,
                Conversation.user_id == user_id,
            )
        )
        if conv_check.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    provider = (payload.provider or settings.DEFAULT_IMAGE_PROVIDER).lower()
    model = payload.model or (
        "dall-e-3" if provider == "openai" else "imagen-3.0-generate-002"
    )
    start_ts = time.perf_counter()

    try:
        if provider == "openai":
            if not settings.OPENAI_API_KEY.strip():
                raise ProviderNotConfiguredError("openai", "OPENAI_API_KEY")
            image_bytes, revised_prompt, remote_url = await _generate_openai_image(
                prompt=payload.prompt,
                model=model,
                size=payload.size,
                quality=payload.quality,
            )
        elif provider == "gemini":
            if not settings.GEMINI_API_KEY.strip():
                raise ProviderNotConfiguredError("gemini", "GEMINI_API_KEY")
            image_bytes, revised_prompt, remote_url = await _generate_gemini_image(
                prompt=payload.prompt,
                model=model,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported image provider '{provider}'. Choose 'openai' or 'gemini'.",
            )
    except ProviderNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "API_KEY_NOT_CONFIGURED",
                "provider": exc.provider,
                "required_env_var": exc.env_var,
                "message": str(exc),
            },
        ) from exc
    except ProviderAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    # Persist generated image on disk + Attachments table
    user_dir = Path(settings.UPLOAD_DIR) / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    filename = f"generated_{uuid.uuid4().hex[:10]}.png"
    storage_path = user_dir / filename
    storage_path.write_bytes(image_bytes)

    attachment = Attachment(
        user_id=user_id,
        conversation_id=payload.conversation_id,
        filename=filename,
        content_type="image/png",
        file_size=len(image_bytes),
        storage_path=str(storage_path),
        kind="generated_image",
        extracted_text=revised_prompt or payload.prompt,
        analysis_json={"prompt": payload.prompt, "provider": provider, "model": model},
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)

    latency_ms = int((time.perf_counter() - start_ts) * 1000)
    await record_usage(
        db,
        user_id=user_id,
        conversation_id=payload.conversation_id,
        action_type="image_generation",
        provider=provider,
        model=model,
        image_count=1,
        latency_ms=latency_ms,
    )

    b64_str = base64.b64encode(image_bytes).decode("ascii")
    return ImageGenerateResponse(
        provider=provider,
        model=model,
        prompt=payload.prompt,
        revised_prompt=revised_prompt,
        image_url=f"/api/v1/files/{attachment.id}/raw",
        image_base64=f"data:image/png;base64,{b64_str}",
        attachment_id=attachment.id,
        conversation_id=payload.conversation_id,
    )


async def _generate_openai_image(
    *, prompt: str, model: str, size: str, quality: str
) -> tuple[bytes, Optional[str], Optional[str]]:
    settings = get_settings()
    url = f"{settings.OPENAI_BASE_URL.rstrip('/')}/images/generations"
    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY.strip()}",
        "Content-Type": "application/json",
    }
    body: dict[str, str] = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "response_format": "b64_json",
    }
    if model == "dall-e-3":
        body["quality"] = quality

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, headers=headers, json=body)
            if resp.status_code >= 400:
                raise ProviderAPIError("openai", resp.status_code, resp.text[:500])
            data = resp.json()
            item = data["data"][0]
            revised_prompt = item.get("revised_prompt")
            if item.get("b64_json"):
                return base64.b64decode(item["b64_json"]), revised_prompt, None
            remote_url = item.get("url")
            if remote_url:
                img_resp = await client.get(remote_url)
                img_resp.raise_for_status()
                return img_resp.content, revised_prompt, remote_url
            raise ProviderAPIError("openai", 500, "No image payload returned from OpenAI.")
    except httpx.TimeoutException as exc:
        raise ProviderAPIError("openai", 504, "OpenAI image generation timed out.") from exc
    except httpx.HTTPError as exc:
        raise ProviderAPIError("openai", 502, f"OpenAI image network error: {type(exc).__name__}") from exc


async def _generate_gemini_image(*, prompt: str, model: str) -> tuple[bytes, Optional[str], Optional[str]]:
    settings = get_settings()
    base = settings.GEMINI_BASE_URL.rstrip("/")
    url = f"{base}/models/{model}:predict"
    headers = {
        "x-goog-api-key": settings.GEMINI_API_KEY.strip(),
        "Content-Type": "application/json",
    }
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {
            "sampleCount": 1,
            "safetySetting": "block_low_and_above",
            "personGeneration": "dont_allow",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code >= 400:
                raise ProviderAPIError("gemini", resp.status_code, resp.text[:500])
            data = resp.json()
            predictions = data.get("predictions") or []
            if not predictions or not predictions[0].get("bytesBase64Encoded"):
                raise ProviderAPIError("gemini", 500, "No image bytes returned from Imagen.")
            img_bytes = base64.b64decode(predictions[0]["bytesBase64Encoded"])
            return img_bytes, None, None
    except httpx.TimeoutException as exc:
        raise ProviderAPIError("gemini", 504, "Gemini image generation timed out.") from exc
    except httpx.HTTPError as exc:
        raise ProviderAPIError("gemini", 502, f"Gemini image network error: {type(exc).__name__}") from exc

