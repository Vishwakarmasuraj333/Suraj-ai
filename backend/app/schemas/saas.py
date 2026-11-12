from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class MemoryCreate(BaseModel):
    title: str = Field(min_length=2, max_length=100)
    content: str = Field(min_length=2, max_length=2000)
    category: str = Field(default="preference", pattern="^(preference|project|fact|instruction)$")


class MemoryUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=100)
    content: Optional[str] = Field(default=None, min_length=2, max_length=2000)
    category: Optional[str] = Field(default=None, pattern="^(preference|project|fact|instruction)$")
    is_active: Optional[bool] = None


class MemoryResponse(BaseModel):
    id: UUID
    title: str
    content: str
    category: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BlogPostCreate(BaseModel):
    title: str = Field(min_length=4, max_length=220)
    slug: Optional[str] = Field(default=None, max_length=240)
    excerpt: str = Field(min_length=10, max_length=600)
    content: str = Field(min_length=40, max_length=100000)
    cover_image_url: Optional[str] = Field(default=None, max_length=500)
    category: str = Field(min_length=2, max_length=80)
    tags: list[str] = Field(default_factory=list, max_length=12)
    author_name: Optional[str] = Field(default=None, max_length=120)
    status: str = Field(default="draft", pattern="^(draft|published)$")
    is_featured: bool = False
    seo_title: Optional[str] = Field(default=None, max_length=220)
    seo_description: Optional[str] = Field(default=None, max_length=320)


class BlogPostUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=4, max_length=220)
    slug: Optional[str] = Field(default=None, max_length=240)
    excerpt: Optional[str] = Field(default=None, min_length=10, max_length=600)
    content: Optional[str] = Field(default=None, min_length=40, max_length=100000)
    cover_image_url: Optional[str] = Field(default=None, max_length=500)
    category: Optional[str] = Field(default=None, min_length=2, max_length=80)
    tags: Optional[list[str]] = Field(default=None, max_length=12)
    author_name: Optional[str] = Field(default=None, max_length=120)
    status: Optional[str] = Field(default=None, pattern="^(draft|published)$")
    is_featured: Optional[bool] = None
    seo_title: Optional[str] = Field(default=None, max_length=220)
    seo_description: Optional[str] = Field(default=None, max_length=320)


class BlogPostResponse(BaseModel):
    id: UUID
    title: str
    slug: str
    excerpt: str
    content: str
    cover_image_url: Optional[str] = None
    category: str
    tags: list[str]
    author_name: str
    reading_time_minutes: int
    status: str
    is_featured: bool
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BlogDetailResponse(BaseModel):
    post: BlogPostResponse
    related: list[BlogPostResponse]
    previous_post: Optional[BlogPostResponse] = None
    next_post: Optional[BlogPostResponse] = None


class PlanTierInfo(BaseModel):
    id: str
    name: str
    tagline: str
    monthly_price_usd: Optional[int]
    yearly_price_usd: Optional[int]
    daily_token_limit: int
    rpm_limit: int
    features: list[str]


class BillingHistoryResponse(BaseModel):
    id: UUID
    plan_tier: str
    amount_cents: int
    currency: str
    status: str
    provider: Optional[str] = None
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionResponse(BaseModel):
    plan_tier: str
    billing_cycle: str
    status: str
    provider: Optional[str] = None
    current_period_end: Optional[datetime] = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class BillingStatusResponse(BaseModel):
    subscription: SubscriptionResponse
    history: list[BillingHistoryResponse]
    stripe_configured: bool
    razorpay_configured: bool


class CheckoutRequest(BaseModel):
    plan_tier: str = Field(pattern="^(free|pro|premium|enterprise)$")
    billing_cycle: str = Field(default="monthly", pattern="^(monthly|yearly)$")
    provider: Optional[str] = Field(default=None, pattern="^(stripe|razorpay)$")


class ContactCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=10, max_length=4000)
    website: str = Field(default="", max_length=200)  # honeypot spam guard


class ContactResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    subject: str
    message: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = Field(default=None, pattern="^(user|admin)$")
