import hashlib
import hmac
import secrets
from datetime import timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.models import EmailOtpToken, Subscription, User, UserPreference, utcnow
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
from app.services.email_service import (
    EmailDeliveryError,
    EmailNotConfiguredError,
    send_email,
)


def _hash_otp(email: str, purpose: str, otp_code: str) -> str:
    settings = get_settings()
    msg = f"{email.lower().strip()}:{purpose}:{otp_code}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def _validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters long.",
        )
    has_letter = any(ch.isalpha() for ch in password)
    has_digit = any(ch.isdigit() for ch in password)
    if not (has_letter and has_digit):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must include at least one letter and one number.",
        )


def _ensure_utc(dt):
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


async def _issue_and_send_otp(
    db: AsyncSession,
    *,
    email: str,
    user_id: Optional[UUID],
    purpose: str,
) -> dict[str, str | int | bool]:
    settings = get_settings()
    if not settings.has_smtp_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "EMAIL_PROVIDER_NOT_CONFIGURED",
                "message": "Email delivery is BLOCKED: configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM_EMAIL in backend/.env.",
            },
        )

    normalized_email = email.lower().strip()
    latest_q = await db.execute(
        select(EmailOtpToken)
        .where(
            EmailOtpToken.email == normalized_email,
            EmailOtpToken.purpose == purpose,
        )
        .order_by(EmailOtpToken.created_at.desc())
        .limit(1)
    )
    latest = latest_q.scalar_one_or_none()
    now = utcnow()
    cooldown = settings.EMAIL_OTP_RESEND_COOLDOWN_SECONDS
    if latest is not None:
        elapsed = (now - _ensure_utc(latest.created_at)).total_seconds()
        if elapsed < cooldown:
            retry_after = max(1, int(cooldown - elapsed))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {retry_after}s before requesting another OTP.",
                headers={"Retry-After": str(retry_after)},
            )

    # Invalidate older active OTPs for same email + purpose
    await db.execute(
        update(EmailOtpToken)
        .where(
            EmailOtpToken.email == normalized_email,
            EmailOtpToken.purpose == purpose,
            EmailOtpToken.used_at.is_(None),
        )
        .values(used_at=now)
    )

    otp_code = f"{secrets.randbelow(900000) + 100000:06d}"
    expires_minutes = settings.EMAIL_OTP_EXPIRE_MINUTES
    token_row = EmailOtpToken(
        email=normalized_email,
        user_id=user_id,
        purpose=purpose,
        otp_hash=_hash_otp(normalized_email, purpose, otp_code),
        expires_at=now + timedelta(minutes=expires_minutes),
        attempts=0,
        max_attempts=settings.EMAIL_OTP_MAX_ATTEMPTS,
    )
    db.add(token_row)
    await db.commit()

    subject = (
        "Verify your SURaj AI email address"
        if purpose == "verify_email"
        else "SURaj AI password reset verification code"
    )
    body = (
        f"Your SURaj AI verification code is: {otp_code}\n\n"
        f"This code expires in {expires_minutes} minutes.\n"
        "If you did not request this code, you can safely ignore this message."
    )
    try:
        await send_email(to_email=normalized_email, subject=subject, plain_body=body)
    except EmailNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "EMAIL_PROVIDER_NOT_CONFIGURED", "message": str(exc)},
        ) from exc
    except EmailDeliveryError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "EMAIL_DELIVERY_FAILED", "message": str(exc)},
        ) from exc

    return {
        "sent": True,
        "expires_in_seconds": expires_minutes * 60,
        "cooldown_seconds": cooldown,
    }


async def register_user(db: AsyncSession, payload: SignupRequest) -> AuthTokenResponse:
    if payload.confirm_password is not None and payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password and confirmation password do not match.",
        )
    if not payload.accept_terms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the Terms of Service and Privacy Policy.",
        )
    _validate_password_strength(payload.password)

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
        is_email_verified=False,
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
    db.add(Subscription(user_id=user.id, plan_tier="free", billing_cycle="monthly", status="active"))
    await db.commit()
    await db.refresh(user)

    verification_status = "unverified_pending_otp"
    if payload.request_otp:
        if settings.has_smtp_configured:
            try:
                await _issue_and_send_otp(db, email=email, user_id=user.id, purpose="verify_email")
                verification_status = "otp_sent"
            except HTTPException:
                verification_status = "otp_delivery_failed"
        else:
            verification_status = "blocked_smtp_not_configured"

    token = create_access_token(str(user.id), {"email": user.email, "role": user.role})
    return AuthTokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
        email_verification_status=verification_status,
    )


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

    token = create_access_token(str(user.id), {"email": user.email, "role": user.role})
    return AuthTokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
        email_verification_status="verified" if user.is_email_verified else "unverified",
    )


async def send_verification_otp(db: AsyncSession, payload: SendOtpRequest) -> dict[str, str | int | bool]:
    email = payload.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        if not get_settings().has_smtp_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "code": "EMAIL_PROVIDER_NOT_CONFIGURED",
                    "message": "Email delivery is BLOCKED: configure SMTP credentials in backend/.env.",
                },
            )
        # Avoid account enumeration when SMTP is configured
        return {"sent": True, "expires_in_seconds": get_settings().EMAIL_OTP_EXPIRE_MINUTES * 60, "cooldown_seconds": get_settings().EMAIL_OTP_RESEND_COOLDOWN_SECONDS}

    return await _issue_and_send_otp(db, email=email, user_id=user.id, purpose=payload.purpose)


async def _consume_valid_otp(
    db: AsyncSession, *, email: str, purpose: str, otp_code: str
) -> EmailOtpToken:
    normalized_email = email.lower().strip()
    result = await db.execute(
        select(EmailOtpToken)
        .where(
            EmailOtpToken.email == normalized_email,
            EmailOtpToken.purpose == purpose,
            EmailOtpToken.used_at.is_(None),
        )
        .order_by(EmailOtpToken.created_at.desc())
        .limit(1)
    )
    token_row = result.scalar_one_or_none()
    if token_row is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification code found. Please request a new OTP.",
        )

    now = utcnow()
    if _ensure_utc(token_row.expires_at) < now:
        token_row.used_at = now
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new OTP.",
        )

    if token_row.attempts >= token_row.max_attempts:
        token_row.used_at = now
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum OTP verification attempts exceeded. Please request a new code.",
        )

    expected_hash = _hash_otp(normalized_email, purpose, otp_code.strip())
    if not hmac.compare_digest(token_row.otp_hash, expected_hash):
        token_row.attempts += 1
        await db.commit()
        remaining = max(0, token_row.max_attempts - token_row.attempts)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code ({remaining} attempts remaining).",
        )

    token_row.used_at = now
    await db.commit()
    return token_row


async def verify_email_otp(db: AsyncSession, payload: VerifyOtpRequest) -> dict[str, str | bool]:
    await _consume_valid_otp(
        db,
        email=payload.email,
        purpose=payload.purpose,
        otp_code=payload.otp,
    )
    normalized_email = payload.email.lower().strip()
    user_q = await db.execute(select(User).where(User.email == normalized_email))
    user = user_q.scalar_one_or_none()
    if user and payload.purpose == "verify_email":
        user.is_email_verified = True
        await db.commit()
    return {"verified": True, "email": normalized_email}


async def forgot_password(db: AsyncSession, payload: ForgotPasswordRequest) -> dict[str, str | int | bool]:
    return await send_verification_otp(
        db, SendOtpRequest(email=payload.email, purpose="reset_password")
    )


async def reset_password(db: AsyncSession, payload: ResetPasswordRequest) -> dict[str, str | bool]:
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password and confirmation do not match.",
        )
    _validate_password_strength(payload.new_password)

    await _consume_valid_otp(
        db,
        email=payload.email,
        purpose="reset_password",
        otp_code=payload.otp,
    )
    normalized_email = payload.email.lower().strip()
    user_q = await db.execute(select(User).where(User.email == normalized_email))
    user = user_q.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    user.password_hash = get_password_hash(payload.new_password)
    await db.commit()
    return {"reset": True, "message": "Password updated successfully. You may now sign in."}


async def change_password(
    db: AsyncSession, user: User, payload: ChangePasswordRequest
) -> dict[str, str | bool]:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password and confirmation do not match.",
        )
    _validate_password_strength(payload.new_password)
    user.password_hash = get_password_hash(payload.new_password)
    await db.commit()
    return {"changed": True, "message": "Password changed successfully."}


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
