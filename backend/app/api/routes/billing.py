import hashlib
import hmac
import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.models.models import BillingHistory, Subscription, User
from app.schemas.saas import BillingStatusResponse, CheckoutRequest, PlanTierInfo
from app.services.billing_service import (
    PLAN_TIERS,
    get_billing_status,
    get_or_create_subscription,
    initiate_checkout,
)

router = APIRouter(prefix="/billing", tags=["Billing & Pricing"])


@router.get("/plans", response_model=dict)
async def list_plans():
    settings = get_settings()
    return {
        "plans": [p.model_dump() for p in PLAN_TIERS],
        "stripe_configured": settings.has_stripe_configured,
        "razorpay_configured": settings.has_razorpay_configured,
    }


@router.get("/status", response_model=BillingStatusResponse)
async def billing_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BillingStatusResponse:
    return await get_billing_status(db, current_user.id)


@router.post("/checkout")
async def create_checkout(
    payload: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await initiate_checkout(db, current_user, payload)


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    settings = get_settings()
    if not settings.STRIPE_WEBHOOK_SECRET.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe webhook secret not configured.",
        )

    raw_body = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")
    parts = dict(item.split("=", 1) for item in sig_header.split(",") if "=" in item)
    timestamp = parts.get("t", "")
    v1_sig = parts.get("v1", "")
    if not timestamp or not v1_sig:
        raise HTTPException(status_code=400, detail="Invalid Stripe-Signature header.")

    signed_payload = f"{timestamp}.{raw_body.decode('utf-8')}".encode("utf-8")
    expected = hmac.new(
        settings.STRIPE_WEBHOOK_SECRET.encode("utf-8"),
        signed_payload,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, v1_sig):
        raise HTTPException(status_code=400, detail="Stripe signature verification failed.")

    event = json.loads(raw_body.decode("utf-8"))
    if event.get("type") == "checkout.session.completed":
        obj = event.get("data", {}).get("object", {})
        ref = obj.get("client_reference_id")
        meta = obj.get("metadata", {})
        if ref:
            uid = UUID(str(ref))
            sub = await get_or_create_subscription(db, uid)
            sub.plan_tier = meta.get("plan_tier", "pro")
            sub.billing_cycle = meta.get("billing_cycle", "monthly")
            sub.status = "active"
            sub.provider = "stripe"
            sub.external_customer_id = obj.get("customer")
            sub.external_subscription_id = obj.get("subscription")
            db.add(
                BillingHistory(
                    user_id=uid,
                    plan_tier=sub.plan_tier,
                    amount_cents=int(obj.get("amount_total") or 0),
                    currency=str(obj.get("currency") or "usd").upper(),
                    status="paid",
                    provider="stripe",
                    external_payment_id=obj.get("id"),
                    description=f"SURaj AI {sub.plan_tier.title()} subscription",
                )
            )
            await db.commit()
    return {"received": True}
