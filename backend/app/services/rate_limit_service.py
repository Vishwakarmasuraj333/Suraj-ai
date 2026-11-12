import math
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

import redis.asyncio as aioredis
from fastapi import HTTPException, status
from redis.exceptions import RedisError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.monitoring import metrics
from app.models.models import UsageRecord
from app.schemas.usage import UsageRecordResponse, UsageSummaryResponse

logger = get_logger("rate_limit")

_SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local cutoff = now - window
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
local count = redis.call('ZCARD', key)
if count >= limit then
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retry_after = window
    if #oldest >= 2 then
        retry_after = math.max(1, math.ceil(window - (now - tonumber(oldest[2]))))
    end
    return {0, retry_after}
end
redis.call('ZADD', key, now, member)
redis.call('EXPIRE', key, window + 5)
return {1, 0}
"""


class SlidingWindowRateLimiter:
    """In-memory per-user sliding-window RPM rate limiter (development fallback)."""

    def __init__(self) -> None:
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    def check_and_record(self, key: str, max_requests: int, window_seconds: int = 60) -> None:
        now = time.monotonic()
        bucket = self._buckets[key]
        cutoff = now - window_seconds
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= max_requests:
            retry_after = max(1, int(math.ceil(window_seconds - (now - bucket[0]))))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded ({max_requests} requests/min). Retry in {retry_after}s.",
                headers={"Retry-After": str(retry_after)},
            )
        bucket.append(now)


rate_limiter = SlidingWindowRateLimiter()

_redis_client: Any = None
_redis_client_url: str = ""


def _build_redis_client(redis_url: str) -> Any:
    return aioredis.from_url(
        redis_url,
        encoding="utf-8",
        decode_responses=True,
        socket_connect_timeout=2.0,
        socket_timeout=2.0,
    )


async def get_redis_client() -> Any:
    global _redis_client, _redis_client_url
    settings = get_settings()
    target_url = settings.REDIS_URL.strip()
    if not target_url:
        return None
    if _redis_client is None or _redis_client_url != target_url:
        if _redis_client is not None:
            try:
                await _redis_client.aclose()
            except Exception:
                pass
        _redis_client = _build_redis_client(target_url)
        _redis_client_url = target_url
    return _redis_client


async def close_redis_client() -> None:
    global _redis_client, _redis_client_url
    if _redis_client is not None:
        try:
            await _redis_client.aclose()
        except Exception:
            pass
    _redis_client = None
    _redis_client_url = ""


def _seconds_until_utc_midnight(now: Optional[datetime] = None) -> int:
    current = now or datetime.now(timezone.utc)
    next_midnight = current.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    return max(1, int(math.ceil((next_midnight - current).total_seconds())))


def _daily_token_key(user_id: UUID, now: Optional[datetime] = None) -> str:
    day_str = (now or datetime.now(timezone.utc)).strftime("%Y-%m-%d")
    return f"suraj:ratelimit:tokens:{user_id}:{day_str}"


async def _query_today_tokens_db(db: AsyncSession, user_id: UUID) -> int:
    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.coalesce(func.sum(UsageRecord.total_tokens), 0)).where(
            UsageRecord.user_id == user_id,
            UsageRecord.created_at >= start_of_day,
        )
    )
    return int(result.scalar_one() or 0)


async def _check_rpm_redis(client: Any, user_id: UUID, max_requests: int, window_seconds: int = 60) -> None:
    now = time.time()
    member = f"{now:.6f}:{uuid.uuid4().hex}"
    rpm_key = f"suraj:ratelimit:rpm:{user_id}"
    allowed, retry_after = await client.eval(
        _SLIDING_WINDOW_LUA,
        1,
        rpm_key,
        str(now),
        str(window_seconds),
        str(max_requests),
        member,
    )
    if int(allowed) == 0:
        retry_s = max(1, int(retry_after))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded ({max_requests} requests/min). Retry in {retry_s}s.",
            headers={"Retry-After": str(retry_s)},
        )


async def ping_redis() -> tuple[bool, str]:
    settings = get_settings()
    if not settings.has_redis_configured:
        return False, "not-configured"
    try:
        client = await get_redis_client()
        if client is None:
            return False, "not-configured"
        pong = await client.ping()
        return (True, "connected") if pong else (False, "unresponsive")
    except (RedisError, OSError, TimeoutError) as exc:
        metrics.record_redis_error()
        logger.warning("Redis health check failed (%s)", type(exc).__name__)
        return False, "unavailable"


async def check_user_limits(db: AsyncSession, user_id: UUID) -> None:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    seconds_until_reset = _seconds_until_utc_midnight(now)
    today_tokens: Optional[int] = None

    client = await get_redis_client()
    if client is not None:
        try:
            await _check_rpm_redis(client, user_id, settings.RATE_LIMIT_REQUESTS_PER_MINUTE)
            token_key = _daily_token_key(user_id, now)
            cached = await client.get(token_key)
            if cached is not None:
                today_tokens = int(cached)
            else:
                today_tokens = await _query_today_tokens_db(db, user_id)
                await client.set(token_key, str(today_tokens), ex=seconds_until_reset)
        except HTTPException:
            raise
        except (RedisError, OSError, TimeoutError, ValueError) as exc:
            metrics.record_redis_error()
            logger.warning("Redis rate limiter error (%s); dev_fallback=%s", type(exc).__name__, settings.allow_rate_limit_dev_fallback)
            if not settings.allow_rate_limit_dev_fallback:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Rate limiting service temporarily unavailable. Please retry shortly.",
                    headers={"Retry-After": "5"},
                ) from exc
            rate_limiter.check_and_record(str(user_id), settings.RATE_LIMIT_REQUESTS_PER_MINUTE)
    else:
        if not settings.allow_rate_limit_dev_fallback:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Distributed rate limiter (REDIS_URL) is not configured for production.",
                headers={"Retry-After": "5"},
            )
        rate_limiter.check_and_record(str(user_id), settings.RATE_LIMIT_REQUESTS_PER_MINUTE)

    if today_tokens is None:
        today_tokens = await _query_today_tokens_db(db, user_id)

    if today_tokens >= settings.RATE_LIMIT_DAILY_TOKENS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily token quota reached. Please try again tomorrow or raise RATE_LIMIT_DAILY_TOKENS.",
            headers={"Retry-After": str(seconds_until_reset)},
        )


async def record_usage(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: Optional[UUID],
    action_type: str,
    provider: str,
    model: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    total_tokens: int = 0,
    image_count: int = 0,
    latency_ms: int = 0,
    status_value: str = "success",
) -> UsageRecord:
    computed_total = total_tokens or (prompt_tokens + completion_tokens)
    record = UsageRecord(
        user_id=user_id,
        conversation_id=conversation_id,
        action_type=action_type,
        provider=provider,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=computed_total,
        image_count=image_count,
        latency_ms=latency_ms,
        status=status_value,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    metrics.record_ai_usage(
        provider=provider,
        total_tokens=computed_total,
        image_count=image_count,
        status_value=status_value,
    )

    if computed_total > 0:
        try:
            client = await get_redis_client()
            if client is not None:
                now = datetime.now(timezone.utc)
                token_key = _daily_token_key(user_id, now)
                ttl = _seconds_until_utc_midnight(now)
                pipe = client.pipeline(transaction=False)
                pipe.incrby(token_key, computed_total)
                pipe.expire(token_key, ttl)
                await pipe.execute()
        except (RedisError, OSError, TimeoutError) as exc:
            metrics.record_redis_error()
            logger.warning("Failed to update Redis token counter (%s)", type(exc).__name__)

    return record


async def get_usage_summary(db: AsyncSession, user_id: UUID, limit: int = 25) -> UsageSummaryResponse:
    settings = get_settings()

    totals_q = await db.execute(
        select(
            func.count(UsageRecord.id),
            func.coalesce(func.sum(UsageRecord.total_tokens), 0),
            func.coalesce(func.sum(UsageRecord.image_count), 0),
        ).where(UsageRecord.user_id == user_id)
    )
    total_requests, total_tokens, total_images = totals_q.one()
    today_tokens = await _query_today_tokens_db(db, user_id)

    recent_q = await db.execute(
        select(UsageRecord)
        .where(UsageRecord.user_id == user_id)
        .order_by(UsageRecord.created_at.desc())
        .limit(limit)
    )
    records = recent_q.scalars().all()

    return UsageSummaryResponse(
        total_requests=int(total_requests or 0),
        total_tokens=int(total_tokens or 0),
        today_tokens=today_tokens,
        daily_token_limit=settings.RATE_LIMIT_DAILY_TOKENS,
        total_images=int(total_images or 0),
        recent_records=[UsageRecordResponse.model_validate(r) for r in records],
    )
