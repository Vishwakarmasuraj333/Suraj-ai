from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.monitoring import metrics
from app.services.rate_limit_service import ping_redis

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    settings = get_settings()
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    redis_ok, redis_status = await ping_redis()
    redis_healthy = redis_ok or (not settings.has_redis_configured and settings.allow_rate_limit_dev_fallback)
    overall_ok = db_ok and redis_healthy

    return {
        "status": "ok" if overall_ok else "degraded",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database_connected": db_ok,
        "database_engine": "postgresql" if settings.is_postgres else "sqlite",
        "redis_connected": redis_ok,
        "redis_status": redis_status,
        "metrics": metrics.snapshot(),
    }
