from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.models.models import User
from app.schemas.settings import (
    CapabilitiesResponse,
    UserPreferencesResponse,
    UserPreferencesUpdate,
)
from app.services.image_generation_service import get_image_provider_capabilities
from app.services.llm_provider_service import get_provider_capabilities
from app.services.user_settings_service import (
    get_or_create_preferences,
    update_preferences,
)

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/preferences", response_model=UserPreferencesResponse)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserPreferencesResponse:
    pref = await get_or_create_preferences(db, current_user.id)
    return UserPreferencesResponse.model_validate(pref)


@router.patch("/preferences", response_model=UserPreferencesResponse)
async def patch_preferences(
    payload: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserPreferencesResponse:
    pref = await update_preferences(db, current_user.id, payload)
    return UserPreferencesResponse.model_validate(pref)


@router.get("/capabilities", response_model=CapabilitiesResponse)
async def get_capabilities(db: AsyncSession = Depends(get_db)) -> CapabilitiesResponse:
    settings = get_settings()
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    llm_providers = get_provider_capabilities()
    image_providers = get_image_provider_capabilities()
    return CapabilitiesResponse(
        database_type="postgresql" if settings.is_postgres else "sqlite",
        database_connected=db_ok,
        llm_providers=llm_providers,
        image_generation_configured=any(bool(p["configured"]) for p in image_providers),
        image_providers=image_providers,
        file_processing={
            "pdf": True,
            "images": True,
            "csv_excel_json": True,
            "code_and_text": True,
        },
        rate_limit_rpm=settings.RATE_LIMIT_REQUESTS_PER_MINUTE,
        rate_limit_daily_tokens=settings.RATE_LIMIT_DAILY_TOKENS,
    )

