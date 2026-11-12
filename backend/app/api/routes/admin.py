from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.config import get_settings
from app.core.database import get_db
from app.core.logging import recent_log_buffer
from app.core.monitoring import metrics
from app.models.models import (
    BlogPost,
    ContactSubmission,
    Conversation,
    Message,
    Subscription,
    UsageRecord,
    User,
)
from app.schemas.auth import UserResponse
from app.schemas.saas import (
    AdminUserUpdate,
    BlogPostCreate,
    BlogPostResponse,
    BlogPostUpdate,
    ContactResponse,
)
from app.services.blog_service import (
    create_blog_post,
    delete_blog_post,
    list_blog_posts,
    save_blog_cover_image,
    update_blog_post,
)
from app.services.image_generation_service import get_image_provider_capabilities
from app.services.llm_provider_service import get_provider_capabilities
from app.services.rate_limit_service import ping_redis

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/overview")
async def admin_overview(
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    settings = get_settings()
    users_count = int((await db.execute(select(func.count(User.id)))).scalar_one() or 0)
    conv_count = int((await db.execute(select(func.count(Conversation.id)))).scalar_one() or 0)
    msg_count = int((await db.execute(select(func.count(Message.id)))).scalar_one() or 0)
    blog_count = int((await db.execute(select(func.count(BlogPost.id)))).scalar_one() or 0)
    published_count = int(
        (
            await db.execute(
                select(func.count(BlogPost.id)).where(BlogPost.status == "published")
            )
        ).scalar_one()
        or 0
    )
    contact_count = int((await db.execute(select(func.count(ContactSubmission.id)))).scalar_one() or 0)

    usage_q = await db.execute(
        select(
            func.count(UsageRecord.id),
            func.coalesce(func.sum(UsageRecord.total_tokens), 0),
            func.coalesce(func.sum(UsageRecord.image_count), 0),
        )
    )
    total_ai_requests, total_tokens, total_images = usage_q.one()

    subs_q = await db.execute(
        select(Subscription.plan_tier, func.count(Subscription.id)).group_by(Subscription.plan_tier)
    )
    plan_breakdown = {tier: int(cnt) for tier, cnt in subs_q.all()}

    redis_ok, redis_status = await ping_redis()

    return {
        "admin_email": admin_user.email,
        "counts": {
            "users": users_count,
            "conversations": conv_count,
            "messages": msg_count,
            "blog_posts": blog_count,
            "published_posts": published_count,
            "contact_submissions": contact_count,
            "ai_requests": int(total_ai_requests or 0),
            "total_tokens": int(total_tokens or 0),
            "total_images": int(total_images or 0),
        },
        "subscriptions_by_tier": plan_breakdown,
        "integrations": {
            "llm_providers": [p.model_dump() for p in get_provider_capabilities()],
            "image_providers": get_image_provider_capabilities(),
            "smtp_configured": settings.has_smtp_configured,
            "stripe_configured": settings.has_stripe_configured,
            "razorpay_configured": settings.has_razorpay_configured,
            "redis_connected": redis_ok,
            "redis_status": redis_status,
        },
        "metrics": metrics.snapshot(),
    }


@router.get("/users", response_model=list[UserResponse])
async def admin_list_users(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[UserResponse]:
    result = await db.execute(select(User).order_by(User.created_at.desc()).limit(200))
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.patch("/users/{user_id}", response_model=UserResponse)
async def admin_update_user(
    user_id: UUID,
    payload: AdminUserUpdate,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.id == admin_user.id and payload.role == "user":
        raise HTTPException(status_code=400, detail="Admins cannot demote their own account.")
    if user.id == admin_user.id and payload.is_active is False:
        raise HTTPException(status_code=400, detail="Admins cannot deactivate their own account.")

    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role is not None:
        user.role = payload.role
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/logs")
async def admin_logs(
    limit: int = Query(default=50, ge=1, le=120),
    _: User = Depends(require_admin),
) -> list[dict[str, Any]]:
    return recent_log_buffer.recent(limit=limit)


@router.get("/contacts", response_model=list[ContactResponse])
async def admin_contacts(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[ContactResponse]:
    result = await db.execute(
        select(ContactSubmission).order_by(ContactSubmission.created_at.desc()).limit(100)
    )
    return [ContactResponse.model_validate(c) for c in result.scalars().all()]


@router.get("/blog/posts", response_model=list[BlogPostResponse])
async def admin_list_blog_posts(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[BlogPostResponse]:
    posts = await list_blog_posts(db, include_drafts=True, limit=100)
    return [BlogPostResponse.model_validate(p) for p in posts]


@router.post("/blog/posts", response_model=BlogPostResponse, status_code=201)
async def admin_create_blog_post(
    payload: BlogPostCreate,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> BlogPostResponse:
    post = await create_blog_post(db, admin_user, payload)
    return BlogPostResponse.model_validate(post)


@router.patch("/blog/posts/{post_id}", response_model=BlogPostResponse)
async def admin_update_blog_post(
    post_id: UUID,
    payload: BlogPostUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> BlogPostResponse:
    post = await update_blog_post(db, post_id, payload)
    return BlogPostResponse.model_validate(post)


@router.delete("/blog/posts/{post_id}", status_code=204)
async def admin_delete_blog_post(
    post_id: UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    await delete_blog_post(db, post_id)


@router.post("/blog/upload-cover")
async def admin_upload_blog_cover(
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
) -> dict[str, str]:
    url = await save_blog_cover_image(file)
    return {"cover_image_url": url}
