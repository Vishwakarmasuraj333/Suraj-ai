from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class AttachmentSummary(BaseModel):
    id: UUID
    filename: str
    content_type: str
    file_size: int
    kind: str
    analysis_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    model: Optional[str] = None
    provider: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    required_env_var: Optional[str] = None
    token_count: int = 0
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    attachments: list[AttachmentSummary] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def _populate_error_meta(self) -> "MessageResponse":
        meta = self.metadata_json or {}
        if not self.error_code and isinstance(meta.get("error_code"), str):
            self.error_code = meta["error_code"]
        if not self.required_env_var and isinstance(meta.get("required_env_var"), str):
            self.required_env_var = meta["required_env_var"]
        return self


class ConversationCreate(BaseModel):
    title: Optional[str] = Field(default="New Conversation", max_length=255)
    provider: Optional[str] = Field(default=None, max_length=32)
    model: Optional[str] = Field(default=None, max_length=100)


class ConversationUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    is_pinned: Optional[bool] = None
    provider: Optional[str] = Field(default=None, max_length=32)
    model: Optional[str] = Field(default=None, max_length=100)


class ConversationResponse(BaseModel):
    id: UUID
    title: str
    provider: str
    model: str
    is_pinned: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetailResponse(ConversationResponse):
    messages: list[MessageResponse] = Field(default_factory=list)


class ChatStreamRequest(BaseModel):
    conversation_id: Optional[UUID] = None
    content: str = Field(min_length=1, max_length=32000)
    provider: Optional[str] = Field(default=None, max_length=32)
    model: Optional[str] = Field(default=None, max_length=100)
    attachment_ids: list[UUID] = Field(default_factory=list)
    language: Optional[str] = Field(default=None, max_length=32)
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)


class EditResendRequest(BaseModel):
    content: str = Field(min_length=1, max_length=32000)
    provider: Optional[str] = Field(default=None, max_length=32)
    model: Optional[str] = Field(default=None, max_length=100)
    attachment_ids: list[UUID] = Field(default_factory=list)


class RegenerateRequest(BaseModel):
    provider: Optional[str] = Field(default=None, max_length=32)
    model: Optional[str] = Field(default=None, max_length=100)


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=4000)
    provider: Optional[str] = Field(default=None, max_length=32)
    model: Optional[str] = Field(default=None, max_length=100)
    size: str = Field(default="1024x1024", pattern="^(1024x1024|1792x1024|1024x1792)$")
    quality: str = Field(default="standard", pattern="^(standard|hd)$")
    conversation_id: Optional[UUID] = None


class ImageGenerateResponse(BaseModel):
    provider: str
    model: str
    prompt: str
    revised_prompt: Optional[str] = None
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    attachment_id: Optional[UUID] = None
    conversation_id: Optional[UUID] = None

