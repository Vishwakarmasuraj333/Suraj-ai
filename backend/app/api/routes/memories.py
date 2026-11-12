from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.models import User
from app.schemas.saas import MemoryCreate, MemoryResponse, MemoryUpdate
from app.services.memory_service import (
    create_memory,
    delete_memory,
    list_memories,
    update_memory,
)

router = APIRouter(prefix="/memories", tags=["AI Memory"])


@router.get("", response_model=list[MemoryResponse])
async def get_memories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MemoryResponse]:
    rows = await list_memories(db, current_user.id)
    return [MemoryResponse.model_validate(r) for r in rows]


@router.post("", response_model=MemoryResponse, status_code=201)
async def add_memory(
    payload: MemoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MemoryResponse:
    row = await create_memory(db, current_user.id, payload)
    return MemoryResponse.model_validate(row)


@router.patch("/{memory_id}", response_model=MemoryResponse)
async def edit_memory(
    memory_id: UUID,
    payload: MemoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MemoryResponse:
    row = await update_memory(db, current_user.id, memory_id, payload)
    return MemoryResponse.model_validate(row)


@router.delete("/{memory_id}", status_code=204)
async def remove_memory(
    memory_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await delete_memory(db, current_user.id, memory_id)
