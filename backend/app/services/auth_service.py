from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.models import User, UserPreference
from app.schemas.auth import AuthTokenResponse, LoginRequest, SignupRequest, UserResponse


async def register_user(db: AsyncSession, payload: SignupRequest) -> AuthTokenResponse:
    email = payload.email.lower().strip()
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    settings = get_settings()
    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        password_hash=get_password_hash(payload.password),
    )
    db.add(user)
    await db.flush()

    preference = UserPreference(
        user_id=user.id,
        theme="dark",
        preferred_language="auto",
        default_provider=settings.DEFAULT_LLM_PROVIDER,
        default_model=settings.DEFAULT_LLM_MODEL,
        stream_responses=True,
        temperature=0.7,
    )
    db.add(preference)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(str(user.id), {"email": user.email})
    return AuthTokenResponse(access_token=token, user=UserResponse.model_validate(user))


async def authenticate_user(db: AsyncSession, payload: LoginRequest) -> AuthTokenResponse:
    email = payload.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )

    token = create_access_token(str(user.id), {"email": user.email})
    return AuthTokenResponse(access_token=token, user=UserResponse.model_validate(user))


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

