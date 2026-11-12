from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class UsageRecordResponse(BaseModel):
    id: UUID
    conversation_id: Optional[UUID] = None
    action_type: str
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    image_count: int
    latency_ms: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UsageSummaryResponse(BaseModel):
    total_requests: int
    total_tokens: int
    today_tokens: int
    daily_token_limit: int
    total_images: int
    recent_records: list[UsageRecordResponse]

