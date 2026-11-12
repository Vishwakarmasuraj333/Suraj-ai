from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.models.models import User
from app.schemas.files import FileUploadResponse
from app.services.file_processing_service import get_attachment_for_user, save_uploaded_file

router = APIRouter(prefix="/files", tags=["Files"])


@router.post("/upload", response_model=FileUploadResponse, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    conversation_id: Optional[UUID] = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileUploadResponse:
    att = await save_uploaded_file(
        db,
        user_id=current_user.id,
        file=file,
        conversation_id=conversation_id,
    )
    preview = (att.extracted_text[:600] + "...") if att.extracted_text and len(att.extracted_text) > 600 else att.extracted_text
    return FileUploadResponse(
        id=att.id,
        filename=att.filename,
        content_type=att.content_type,
        file_size=att.file_size,
        kind=att.kind,
        extracted_text_preview=preview,
        analysis_json=att.analysis_json or {},
        created_at=att.created_at,
    )


@router.get("/{attachment_id}", response_model=FileUploadResponse)
async def get_file_info(
    attachment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileUploadResponse:
    att = await get_attachment_for_user(db, current_user.id, attachment_id)
    return FileUploadResponse(
        id=att.id,
        filename=att.filename,
        content_type=att.content_type,
        file_size=att.file_size,
        kind=att.kind,
        extracted_text_preview=att.extracted_text,
        analysis_json=att.analysis_json or {},
        created_at=att.created_at,
    )


@router.get("/{attachment_id}/raw")
async def download_raw_file(
    attachment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    att = await get_attachment_for_user(db, current_user.id, attachment_id)
    upload_root = Path(get_settings().UPLOAD_DIR).resolve()
    path = Path(att.storage_path).resolve()
    if not path.is_relative_to(upload_root) or not path.exists():
        raise HTTPException(status_code=404, detail="Stored file not found on disk.")
    return FileResponse(path=path, media_type=att.content_type, filename=att.filename)

