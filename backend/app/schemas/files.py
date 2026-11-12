from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class FileUploadResponse(BaseModel):
    id: UUID
    filename: str
    content_type: str
    file_size: int
    kind: str
    extracted_text_preview: Optional[str] = None
    analysis_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

