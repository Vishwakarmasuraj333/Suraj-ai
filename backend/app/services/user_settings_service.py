from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.models import UserPreference
from app.schemas.settings import UserPreferencesUpdate


async def get_or_create_preferences(db: AsyncSession, user_id: UUID) -> UserPreference:
    result = await db.execute(select(UserPreference).where(UserPreference.user_id == user_id))
    pref = result.scalar_one_or_none()
    if pref is None:
        settings = get_settings()
        pref = UserPreference(
            user_id=user_id,
            theme="dark",
            preferred_language="auto",
            default_provider=settings.DEFAULT_LLM_PROVIDER,
            default_model=settings.DEFAULT_LLM_MODEL,
            stream_responses=True,
            temperature=0.7,
        )
        db.add(pref)
        await db.commit()
        await db.refresh(pref)
    return pref


async def update_preferences(
    db: AsyncSession, user_id: UUID, payload: UserPreferencesUpdate
) -> UserPreference:
    pref = await get_or_create_preferences(db, user_id)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pref, field, value)
    await db.commit()
    await db.refresh(pref)
    return pref

