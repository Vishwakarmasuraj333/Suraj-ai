from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import UserMemory
from app.schemas.saas import MemoryCreate, MemoryUpdate


async def list_memories(db: AsyncSession, user_id: UUID) -> list[UserMemory]:
    result = await db.execute(
        select(UserMemory)
        .where(UserMemory.user_id == user_id)
        .order_by(UserMemory.updated_at.desc())
    )
    return list(result.scalars().all())


async def create_memory(db: AsyncSession, user_id: UUID, payload: MemoryCreate) -> UserMemory:
    memory = UserMemory(
        user_id=user_id,
        title=payload.title.strip(),
        content=payload.content.strip(),
        category=payload.category,
        is_active=True,
    )
    db.add(memory)
    await db.commit()
    await db.refresh(memory)
    return memory


async def update_memory(
    db: AsyncSession, user_id: UUID, memory_id: UUID, payload: MemoryUpdate
) -> UserMemory:
    result = await db.execute(
        select(UserMemory).where(UserMemory.id == memory_id, UserMemory.user_id == user_id)
    )
    memory = result.scalar_one_or_none()
    if memory is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory item not found.")

    if payload.title is not None:
        memory.title = payload.title.strip()
    if payload.content is not None:
        memory.content = payload.content.strip()
    if payload.category is not None:
        memory.category = payload.category
    if payload.is_active is not None:
        memory.is_active = payload.is_active

    await db.commit()
    await db.refresh(memory)
    return memory


async def delete_memory(db: AsyncSession, user_id: UUID, memory_id: UUID) -> None:
    result = await db.execute(
        select(UserMemory).where(UserMemory.id == memory_id, UserMemory.user_id == user_id)
    )
    memory = result.scalar_one_or_none()
    if memory is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory item not found.")
    await db.delete(memory)
    await db.commit()


async def get_active_memories_prompt(db: AsyncSession, user_id: UUID) -> str:
    result = await db.execute(
        select(UserMemory)
        .where(UserMemory.user_id == user_id, UserMemory.is_active.is_(True))
        .order_by(UserMemory.updated_at.desc())
        .limit(15)
    )
    items = list(result.scalars().all())
    if not items:
        return ""
    lines = [f"- [{m.category}] {m.title}: {m.content}" for m in items]
    return "\n".join(lines)
