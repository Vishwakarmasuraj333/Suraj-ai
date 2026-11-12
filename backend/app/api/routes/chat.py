from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.models import User
from app.schemas.chat import ChatStreamRequest, EditResendRequest, RegenerateRequest
from app.services.ai_conversation_service import (
    execute_prepared_stream,
    prepare_edit_and_resend,
    prepare_new_turn,
    prepare_regenerate,
)

router = APIRouter(prefix="/chat", tags=["AI Chat"])

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


@router.post("/stream")
async def chat_stream(
    payload: ChatStreamRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    ctx = await prepare_new_turn(db, user_id=current_user.id, payload=payload)
    return StreamingResponse(
        execute_prepared_stream(request, ctx),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


@router.post("/conversations/{conversation_id}/messages/{message_id}/edit-resend")
async def edit_resend_stream(
    conversation_id: UUID,
    message_id: UUID,
    payload: EditResendRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    ctx = await prepare_edit_and_resend(
        db,
        user_id=current_user.id,
        conversation_id=conversation_id,
        message_id=message_id,
        payload=payload,
    )
    return StreamingResponse(
        execute_prepared_stream(request, ctx),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


@router.post("/conversations/{conversation_id}/messages/{message_id}/regenerate")
async def regenerate_stream(
    conversation_id: UUID,
    message_id: UUID,
    payload: RegenerateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    ctx = await prepare_regenerate(
        db,
        user_id=current_user.id,
        conversation_id=conversation_id,
        message_id=message_id,
        payload=payload,
    )
    return StreamingResponse(
        execute_prepared_stream(request, ctx),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )

