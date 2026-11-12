from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.models import User
from app.schemas.chat import ImageGenerateRequest, ImageGenerateResponse
from app.services.image_generation_service import generate_image
from app.services.rate_limit_service import check_user_limits

router = APIRouter(prefix="/images", tags=["Image Generation"])


@router.post("/generate", response_model=ImageGenerateResponse)
async def create_image(
    payload: ImageGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImageGenerateResponse:
    await check_user_limits(db, current_user.id)
    return await generate_image(db, user_id=current_user.id, payload=payload)

