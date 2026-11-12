from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.saas import BlogDetailResponse, BlogPostResponse
from app.services.blog_service import (
    BLOG_CATEGORIES,
    get_blog_post_detail,
    list_blog_posts,
    resolve_blog_media_path,
    seed_initial_blog_posts,
)

router = APIRouter(prefix="/blog", tags=["Blog"])


@router.get("/categories", response_model=list[str])
async def get_categories() -> list[str]:
    return BLOG_CATEGORIES


@router.get("/posts", response_model=list[BlogPostResponse])
async def get_published_posts(
    category: Optional[str] = Query(default=None, max_length=80),
    search: Optional[str] = Query(default=None, max_length=120),
    featured: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[BlogPostResponse]:
    await seed_initial_blog_posts(db)
    posts = await list_blog_posts(
        db,
        category=category,
        search=search,
        featured_only=featured,
        include_drafts=False,
        limit=limit,
    )
    return [BlogPostResponse.model_validate(p) for p in posts]


@router.get("/posts/{slug}", response_model=BlogDetailResponse)
async def get_post_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> BlogDetailResponse:
    await seed_initial_blog_posts(db)
    return await get_blog_post_detail(db, slug)


@router.get("/media/{filename}")
async def get_blog_cover_media(filename: str):
    path = resolve_blog_media_path(filename)
    return FileResponse(path)
