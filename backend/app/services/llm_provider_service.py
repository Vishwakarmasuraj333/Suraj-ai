import json
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger
from app.schemas.settings import ProviderCapability

logger = get_logger("llm_provider")


class ProviderNotConfiguredError(Exception):
    def __init__(self, provider: str, env_var: str) -> None:
        self.provider = provider
        self.env_var = env_var
        super().__init__(
            f"Provider '{provider}' is not configured. Set {env_var} in backend/.env to enable real AI responses."
        )


class ProviderAPIError(Exception):
    def __init__(self, provider: str, status_code: int, message: str) -> None:
        self.provider = provider
        self.status_code = status_code
        super().__init__(f"{provider} API error ({status_code}): {message}")


@dataclass
class ChatMessagePayload:
    role: str  # system | user | assistant
    text: str
    images: list[tuple[str, str]] = field(default_factory=list)  # list of (mime_type, base64_data)


@dataclass
class StreamChunk:
    delta: str = ""
    done: bool = False
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


def get_provider_capabilities() -> list[ProviderCapability]:
    settings = get_settings()
    openai_configured = bool(settings.OPENAI_API_KEY.strip()) or (
        "localhost" in settings.OPENAI_BASE_URL or "127.0.0.1" in settings.OPENAI_BASE_URL
    )
    return [
        ProviderCapability(
            id="openai",
            name="OpenAI (or OpenAI-Compatible)",
            configured=openai_configured,
            models=["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "o4-mini"],
            supports_vision=True,
            supports_streaming=True,
            required_env_var="OPENAI_API_KEY",
        ),
        ProviderCapability(
            id="gemini",
            name="Google Gemini",
            configured=bool(settings.GEMINI_API_KEY.strip()),
            models=["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
            supports_vision=True,
            supports_streaming=True,
            required_env_var="GEMINI_API_KEY",
        ),
        ProviderCapability(
            id="anthropic",
            name="Anthropic Claude",
            configured=bool(settings.ANTHROPIC_API_KEY.strip()),
            models=["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
            supports_vision=True,
            supports_streaming=True,
            required_env_var="ANTHROPIC_API_KEY",
        ),
    ]


def ensure_provider_configured(provider: str) -> None:
    settings = get_settings()
    if provider == "openai":
        is_local = "localhost" in settings.OPENAI_BASE_URL or "127.0.0.1" in settings.OPENAI_BASE_URL
        if not settings.OPENAI_API_KEY.strip() and not is_local:
            raise ProviderNotConfiguredError("openai", "OPENAI_API_KEY")
    elif provider == "gemini":
        if not settings.GEMINI_API_KEY.strip():
            raise ProviderNotConfiguredError("gemini", "GEMINI_API_KEY")
    elif provider == "anthropic":
        if not settings.ANTHROPIC_API_KEY.strip():
            raise ProviderNotConfiguredError("anthropic", "ANTHROPIC_API_KEY")
    else:
        raise ProviderNotConfiguredError(provider, "OPENAI_API_KEY / GEMINI_API_KEY / ANTHROPIC_API_KEY")


async def stream_chat_completion(
    *,
    provider: str,
    model: str,
    messages: list[ChatMessagePayload],
    temperature: float = 0.7,
) -> AsyncGenerator[StreamChunk, None]:
    ensure_provider_configured(provider)
    if provider == "openai":
        async for chunk in _stream_openai(model=model, messages=messages, temperature=temperature):
            yield chunk
    elif provider == "gemini":
        async for chunk in _stream_gemini(model=model, messages=messages, temperature=temperature):
            yield chunk
    elif provider == "anthropic":
        async for chunk in _stream_anthropic(model=model, messages=messages, temperature=temperature):
            yield chunk


async def _stream_openai(
    *,
    model: str,
    messages: list[ChatMessagePayload],
    temperature: float,
) -> AsyncGenerator[StreamChunk, None]:
    settings = get_settings()
    url = f"{settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions"
    headers = {"Content-Type": "application/json"}
    if settings.OPENAI_API_KEY.strip():
        headers["Authorization"] = f"Bearer {settings.OPENAI_API_KEY.strip()}"

    formatted_messages: list[dict[str, Any]] = []
    for msg in messages:
        if msg.images and msg.role == "user":
            content_parts: list[dict[str, Any]] = [{"type": "text", "text": msg.text}]
            for mime, b64 in msg.images:
                content_parts.append(
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}
                )
            formatted_messages.append({"role": msg.role, "content": content_parts})
        else:
            formatted_messages.append({"role": msg.role, "content": msg.text})

    payload: dict[str, Any] = {
        "model": model,
        "messages": formatted_messages,
        "temperature": temperature,
        "stream": True,
        "stream_options": {"include_usage": True},
    }

    prompt_tokens = 0
    completion_tokens = 0
    total_tokens = 0

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=15.0)) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as resp:
                if resp.status_code >= 400:
                    body = (await resp.aread()).decode("utf-8", errors="replace")
                    raise ProviderAPIError("openai", resp.status_code, body[:500])

                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data_str = line[5:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue

                    if usage := data.get("usage"):
                        prompt_tokens = int(usage.get("prompt_tokens", prompt_tokens))
                        completion_tokens = int(usage.get("completion_tokens", completion_tokens))
                        total_tokens = int(usage.get("total_tokens", total_tokens))

                    choices = data.get("choices") or []
                    if choices:
                        delta = choices[0].get("delta", {}).get("content")
                        if delta:
                            yield StreamChunk(delta=delta)
    except httpx.TimeoutException as exc:
        raise ProviderAPIError("openai", 504, "OpenAI request timed out.") from exc
    except httpx.HTTPError as exc:
        raise ProviderAPIError("openai", 502, f"OpenAI network error: {type(exc).__name__}") from exc

    yield StreamChunk(
        done=True,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens or (prompt_tokens + completion_tokens),
    )


async def _stream_gemini(
    *,
    model: str,
    messages: list[ChatMessagePayload],
    temperature: float,
) -> AsyncGenerator[StreamChunk, None]:
    settings = get_settings()
    base = settings.GEMINI_BASE_URL.rstrip("/")
    url = f"{base}/models/{model}:streamGenerateContent?alt=sse"
    headers = {
        "x-goog-api-key": settings.GEMINI_API_KEY.strip(),
        "Content-Type": "application/json",
    }

    system_parts: list[str] = []
    contents: list[dict[str, Any]] = []
    for msg in messages:
        if msg.role == "system":
            system_parts.append(msg.text)
            continue
        role = "model" if msg.role == "assistant" else "user"
        parts: list[dict[str, Any]] = [{"text": msg.text}]
        for mime, b64 in msg.images:
            parts.append({"inlineData": {"mimeType": mime, "data": b64}})
        contents.append({"role": role, "parts": parts})

    payload: dict[str, Any] = {
        "contents": contents,
        "generationConfig": {"temperature": temperature},
    }
    if system_parts:
        payload["systemInstruction"] = {"parts": [{"text": "\n\n".join(system_parts)}]}

    prompt_tokens = 0
    completion_tokens = 0
    total_tokens = 0

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=15.0)) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as resp:
                if resp.status_code >= 400:
                    body = (await resp.aread()).decode("utf-8", errors="replace")
                    raise ProviderAPIError("gemini", resp.status_code, body[:500])

                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data_str = line[5:].strip()
                    try:
                        data = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue

                    if usage := data.get("usageMetadata"):
                        prompt_tokens = int(usage.get("promptTokenCount", prompt_tokens))
                        completion_tokens = int(usage.get("candidatesTokenCount", completion_tokens))
                        total_tokens = int(usage.get("totalTokenCount", total_tokens))

                    candidates = data.get("candidates") or []
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts") or []
                        for part in parts:
                            text = part.get("text")
                            if text:
                                yield StreamChunk(delta=text)
    except httpx.TimeoutException as exc:
        raise ProviderAPIError("gemini", 504, "Gemini request timed out.") from exc
    except httpx.HTTPError as exc:
        raise ProviderAPIError("gemini", 502, f"Gemini network error: {type(exc).__name__}") from exc

    yield StreamChunk(
        done=True,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens or (prompt_tokens + completion_tokens),
    )


async def _stream_anthropic(
    *,
    model: str,
    messages: list[ChatMessagePayload],
    temperature: float,
) -> AsyncGenerator[StreamChunk, None]:
    settings = get_settings()
    url = f"{settings.ANTHROPIC_BASE_URL.rstrip('/')}/messages"
    headers = {
        "x-api-key": settings.ANTHROPIC_API_KEY.strip(),
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    system_parts: list[str] = []
    formatted_messages: list[dict[str, Any]] = []
    for msg in messages:
        if msg.role == "system":
            system_parts.append(msg.text)
            continue
        if msg.images and msg.role == "user":
            blocks: list[dict[str, Any]] = []
            for mime, b64 in msg.images:
                blocks.append(
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": mime, "data": b64},
                    }
                )
            blocks.append({"type": "text", "text": msg.text})
            formatted_messages.append({"role": msg.role, "content": blocks})
        else:
            formatted_messages.append({"role": msg.role, "content": msg.text})

    payload: dict[str, Any] = {
        "model": model,
        "max_tokens": 4096,
        "temperature": temperature,
        "stream": True,
        "messages": formatted_messages,
    }
    if system_parts:
        payload["system"] = "\n\n".join(system_parts)

    prompt_tokens = 0
    completion_tokens = 0

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=15.0)) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as resp:
                if resp.status_code >= 400:
                    body = (await resp.aread()).decode("utf-8", errors="replace")
                    raise ProviderAPIError("anthropic", resp.status_code, body[:500])

                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data_str = line[5:].strip()
                    try:
                        data = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue

                    evt_type = data.get("type")
                    if evt_type == "message_start":
                        usage = data.get("message", {}).get("usage", {})
                        prompt_tokens = int(usage.get("input_tokens", prompt_tokens))
                    elif evt_type == "content_block_delta":
                        delta = data.get("delta", {}).get("text")
                        if delta:
                            yield StreamChunk(delta=delta)
                    elif evt_type == "message_delta":
                        usage = data.get("usage", {})
                        completion_tokens = int(usage.get("output_tokens", completion_tokens))
    except httpx.TimeoutException as exc:
        raise ProviderAPIError("anthropic", 504, "Anthropic request timed out.") from exc
    except httpx.HTTPError as exc:
        raise ProviderAPIError("anthropic", 502, f"Anthropic network error: {type(exc).__name__}") from exc

    yield StreamChunk(
        done=True,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens,
    )

