import hashlib

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.models import ContactSubmission
from app.schemas.saas import ContactCreate, ContactResponse
from app.services.email_service import send_email
from app.services.rate_limit_service import rate_limiter

router = APIRouter(prefix="/contact", tags=["Contact"])


@router.post("", response_model=ContactResponse, status_code=201)
async def submit_contact(
    payload: ContactCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> ContactResponse:
    if payload.website.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid form submission.",
        )

    client_ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(client_ip.encode("utf-8")).hexdigest()[:32]
    rate_limiter.check_and_record(f"contact:{ip_hash}", max_requests=5, window_seconds=300)

    row = ContactSubmission(
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        subject=payload.subject.strip(),
        message=payload.message.strip(),
        status="new",
        ip_hash=ip_hash,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)

    settings = get_settings()
    if settings.has_smtp_configured:
        try:
            await send_email(
                to_email=settings.SMTP_FROM_EMAIL,
                subject=f"[SURaj AI Contact] {row.subject}",
                plain_body=f"From: {row.name} <{row.email}>\n\n{row.message}",
            )
        except Exception:
            pass

    return ContactResponse.model_validate(row)
