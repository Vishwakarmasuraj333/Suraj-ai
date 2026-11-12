from uuid import UUID

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.models import BillingHistory, Subscription, User
from app.schemas.saas import (
    BillingHistoryResponse,
    BillingStatusResponse,
    CheckoutRequest,
    PlanTierInfo,
    SubscriptionResponse,
)

PLAN_TIERS: list[PlanTierInfo] = [
    PlanTierInfo(
        id="free",
        name="Free",
        tagline="Explore SURaj AI with essential chat and document processing.",
        monthly_price_usd=0,
        yearly_price_usd=0,
        daily_token_limit=50000,
        rpm_limit=15,
        features=[
            "Multi-provider AI chat (configured keys)",
            "Basic PDF, CSV, JSON & code analysis",
            "Saved conversation history & search",
            "Markdown, KaTeX, Mermaid & Recharts rendering",
        ],
    ),
    PlanTierInfo(
        id="pro",
        name="Pro",
        tagline="Designed for daily builders, coders, and researchers.",
        monthly_price_usd=19,
        yearly_price_usd=180,
        daily_token_limit=500000,
        rpm_limit=60,
        features=[
            "Higher daily token quota & 60 RPM ceiling",
            "Priority access to all configured LLM & vision models",
            "Expanded Knowledge RAG document chunking",
            "Persistent AI Memory across conversations",
            "AI Image Studio generation workflows",
        ],
    ),
    PlanTierInfo(
        id="premium",
        name="Premium",
        tagline="Maximum throughput and advanced workflows for power users.",
        monthly_price_usd=49,
        yearly_price_usd=468,
        daily_token_limit=2000000,
        rpm_limit=120,
        features=[
            "2M daily token quota & 120 RPM burst capacity",
            "High-volume multi-document RAG workflows",
            "Extended file upload & storage allowances",
            "Priority routing across OpenAI, Gemini & Claude",
        ],
    ),
    PlanTierInfo(
        id="enterprise",
        name="Enterprise",
        tagline="Custom limits, dedicated deployments, and team governance.",
        monthly_price_usd=None,
        yearly_price_usd=None,
        daily_token_limit=10000000,
        rpm_limit=300,
        features=[
            "Custom rate limits & dedicated PostgreSQL + Redis stack",
            "Role-based admin governance & audit metrics",
            "Private VPC / self-hosted Docker Compose deployment",
            "Dedicated onboarding & custom SLA terms",
        ],
    ),
]


async def get_or_create_subscription(db: AsyncSession, user_id: UUID) -> Subscription:
    result = await db.execute(select(Subscription).where(Subscription.user_id == user_id))
    sub = result.scalar_one_or_none()
    if sub is None:
        sub = Subscription(user_id=user_id, plan_tier="free", billing_cycle="monthly", status="active")
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
    return sub


async def get_billing_status(db: AsyncSession, user_id: UUID) -> BillingStatusResponse:
    settings = get_settings()
    sub = await get_or_create_subscription(db, user_id)
    hist_q = await db.execute(
        select(BillingHistory)
        .where(BillingHistory.user_id == user_id)
        .order_by(BillingHistory.created_at.desc())
        .limit(25)
    )
    history = list(hist_q.scalars().all())
    return BillingStatusResponse(
        subscription=SubscriptionResponse.model_validate(sub),
        history=[BillingHistoryResponse.model_validate(h) for h in history],
        stripe_configured=settings.has_stripe_configured,
        razorpay_configured=settings.has_razorpay_configured,
    )


async def initiate_checkout(
    db: AsyncSession, user: User, payload: CheckoutRequest
) -> dict[str, str | bool]:
    settings = get_settings()
    sub = await get_or_create_subscription(db, user.id)

    if payload.plan_tier == "free":
        sub.plan_tier = "free"
        sub.billing_cycle = payload.billing_cycle
        sub.status = "active"
        sub.provider = None
        await db.commit()
        return {
            "status": "updated",
            "plan_tier": "free",
            "message": "Your account is active on the Free tier.",
        }

    if payload.plan_tier == "enterprise":
        return {
            "status": "contact_required",
            "plan_tier": "enterprise",
            "redirect_url": "/contact",
            "message": "Enterprise plans require custom provisioning. Please reach out via Contact.",
        }

    # Paid tier: never simulate a successful payment if real gateway credentials are missing
    chosen_provider = payload.provider or (
        "stripe"
        if settings.has_stripe_configured
        else ("razorpay" if settings.has_razorpay_configured else None)
    )
    if chosen_provider is None or (
        chosen_provider == "stripe" and not settings.has_stripe_configured
    ) or (
        chosen_provider == "razorpay" and not settings.has_razorpay_configured
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "PAYMENT_GATEWAY_NOT_CONFIGURED",
                "message": (
                    "Paid checkout is BLOCKED: configure STRIPE_SECRET_KEY or RAZORPAY_KEY_ID/"
                    "RAZORPAY_KEY_SECRET in backend/.env. Payments are never simulated."
                ),
            },
        )

    tier_info = next((t for t in PLAN_TIERS if t.id == payload.plan_tier), None)
    if tier_info is None or tier_info.monthly_price_usd is None:
        raise HTTPException(status_code=400, detail="Invalid paid tier.")

    amount_usd = (
        tier_info.yearly_price_usd
        if payload.billing_cycle == "yearly" and tier_info.yearly_price_usd
        else tier_info.monthly_price_usd
    )
    amount_cents = int(amount_usd) * 100

    if chosen_provider == "stripe":
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.stripe.com/v1/checkout/sessions",
                auth=(settings.STRIPE_SECRET_KEY, ""),
                data={
                    "mode": "subscription",
                    "success_url": f"{settings.FRONTEND_BASE_URL}/pricing?checkout=success",
                    "cancel_url": f"{settings.FRONTEND_BASE_URL}/pricing?checkout=cancelled",
                    "customer_email": user.email,
                    "client_reference_id": str(user.id),
                    "metadata[plan_tier]": payload.plan_tier,
                    "metadata[billing_cycle]": payload.billing_cycle,
                    "line_items[0][price_data][currency]": "usd",
                    "line_items[0][price_data][unit_amount]": str(amount_cents),
                    "line_items[0][price_data][recurring][interval]": (
                        "year" if payload.billing_cycle == "yearly" else "month"
                    ),
                    "line_items[0][price_data][product_data][name]": f"SURaj AI {tier_info.name}",
                    "line_items[0][quantity]": "1",
                },
            )
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Stripe checkout session creation failed. Verify Stripe credentials.",
                )
            data = resp.json()
            return {
                "status": "checkout_created",
                "provider": "stripe",
                "checkout_url": data.get("url", ""),
                "session_id": data.get("id", ""),
            }

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "code": "PAYMENT_GATEWAY_NOT_CONFIGURED",
            "message": "Razorpay server checkout order endpoint requires configured order webhook verification.",
        },
    )
