import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.models import NewsletterSubscriber
from app.services.email_service import EmailDeliveryError, EmailNotConfiguredError, send_email

router = APIRouter(prefix="/newsletter", tags=["Newsletter"])


class NewsletterSubscribeRequest(BaseModel):
    email: EmailStr
    consent: bool = False
    website: str = Field(default="", max_length=200)


class NewsletterUnsubscribeRequest(BaseModel):
    email: EmailStr
    token: str | None = Field(default=None, max_length=128)


@router.post("/subscribe", status_code=201)
async def subscribe_newsletter(
    payload: NewsletterSubscribeRequest,
    db: AsyncSession = Depends(get_db),
):
    if payload.website.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid submission.")
    if not payload.consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit consent is required to subscribe to SURaj AI updates.",
        )

    email = payload.email.lower().strip()
    existing = (
        await db.execute(select(NewsletterSubscriber).where(NewsletterSubscriber.email == email))
    ).scalar_one_or_none()

    token = secrets.token_urlsafe(24)
    now = datetime.now(timezone.utc)

    if existing is None:
        sub = NewsletterSubscriber(
            email=email,
            consent=True,
            is_active=True,
            unsubscribe_token=token,
            subscribed_at=now,
        )
        db.add(sub)
        await db.commit()
    else:
        existing.consent = True
        existing.is_active = True
        existing.unsubscribed_at = None
        if not existing.unsubscribe_token:
            existing.unsubscribe_token = token
        token = existing.unsubscribe_token
        await db.commit()

    settings = get_settings()
    email_sent = False
    email_status = "smtp_not_configured"
    if settings.has_smtp_configured:
        unsub_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/#newsletter"
        try:
            await send_email(
                to_email=email,
                subject="Subscribed to SURaj AI Engineering Updates",
                plain_body=(
                    "You are subscribed to SURaj AI engineering & product updates.\n"
                    f"To unsubscribe anytime, visit {unsub_url} or use token: {token}"
                ),
            )
            email_sent = True
            email_status = "confirmation_sent"
        except (EmailNotConfiguredError, EmailDeliveryError):
            email_status = "confirmation_failed"

    return {
        "subscribed": True,
        "email": email,
        "email_sent": email_sent,
        "email_status": email_status,
        "message": (
            "Subscription saved and confirmation email sent."
            if email_sent
            else "Subscription saved in database. Email confirmation skipped because SMTP is not configured."
        ),
    }


@router.post("/unsubscribe")
async def unsubscribe_newsletter(
    payload: NewsletterUnsubscribeRequest,
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.lower().strip()
    existing = (
        await db.execute(select(NewsletterSubscriber).where(NewsletterSubscriber.email == email))
    ).scalar_one_or_none()

    if existing is None or not existing.is_active:
        return {"unsubscribed": True, "email": email, "message": "Email is not currently subscribed."}

    if payload.token and existing.unsubscribe_token != payload.token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid unsubscribe token.")

    existing.is_active = False
    existing.unsubscribed_at = datetime.now(timezone.utc)
    await db.commit()
    return {"unsubscribed": True, "email": email, "message": "You have been unsubscribed."}
