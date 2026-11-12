from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.models import User
from app.schemas.auth import (
    AuthTokenResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    SendOtpRequest,
    SignupRequest,
    UserResponse,
    VerifyOtpRequest,
)
from app.services.auth_service import (
    authenticate_user,
    change_password,
    forgot_password,
    register_user,
    reset_password,
    send_verification_otp,
    verify_email_otp,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=AuthTokenResponse, status_code=201)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)) -> AuthTokenResponse:
    return await register_user(db, payload)


@router.post("/login", response_model=AuthTokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> AuthTokenResponse:
    return await authenticate_user(db, payload)


@router.post("/send-otp")
async def send_otp(payload: SendOtpRequest, db: AsyncSession = Depends(get_db)):
    return await send_verification_otp(db, payload)


@router.post("/verify-otp")
async def verify_otp(payload: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    return await verify_email_otp(db, payload)


@router.post("/forgot-password")
async def forgot_password_endpoint(
    payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
):
    return await forgot_password(db, payload)


@router.post("/reset-password")
async def reset_password_endpoint(
    payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)
):
    return await reset_password(db, payload)


@router.post("/change-password")
async def change_password_endpoint(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await change_password(db, current_user, payload)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)) -> dict[str, str]:
    return {"status": "logged_out", "user_id": str(current_user.id)}
