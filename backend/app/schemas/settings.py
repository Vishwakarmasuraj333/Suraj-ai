from typing import Optional

from pydantic import BaseModel, Field


class UserPreferencesResponse(BaseModel):
    theme: str
    preferred_language: str
    default_provider: str
    default_model: str
    system_instructions: Optional[str] = None
    stream_responses: bool
    temperature: float

    model_config = {"from_attributes": True}


class UserPreferencesUpdate(BaseModel):
    theme: Optional[str] = Field(default=None, pattern="^(dark|light|system)$")
    preferred_language: Optional[str] = Field(default=None, max_length=32)
    default_provider: Optional[str] = Field(default=None, max_length=32)
    default_model: Optional[str] = Field(default=None, max_length=100)
    system_instructions: Optional[str] = Field(default=None, max_length=4000)
    stream_responses: Optional[bool] = None
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)


class ProviderCapability(BaseModel):
    id: str
    name: str
    configured: bool
    models: list[str]
    supports_vision: bool
    supports_streaming: bool
    required_env_var: str


class CapabilitiesResponse(BaseModel):
    database_type: str
    database_connected: bool
    llm_providers: list[ProviderCapability]
    image_generation_configured: bool
    image_providers: list[dict[str, str | bool]]
    file_processing: dict[str, bool]
    rate_limit_rpm: int
    rate_limit_daily_tokens: int

