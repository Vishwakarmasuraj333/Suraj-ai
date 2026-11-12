import math
import re
from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.models import BlogPost, User, utcnow
from app.schemas.saas import BlogDetailResponse, BlogPostCreate, BlogPostResponse, BlogPostUpdate

BLOG_CATEGORIES: list[str] = [
    "Artificial Intelligence",
    "Machine Learning",
    "Deep Learning",
    "Generative AI",
    "Large Language Models",
    "Prompt Engineering",
    "AI Automation",
    "RAG and Vector Databases",
    "AI Coding",
    "Python Development",
    "Computer Vision",
    "Data Science",
    "AI Security",
    "SURaj AI Product Updates",
]

_BLOG_MEDIA_SUBDIR = "blog_covers"
_ALLOWED_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}


def slugify(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\s-]", "", text.lower()).strip()
    collapsed = re.sub(r"[\s_-]+", "-", cleaned).strip("-")
    return collapsed[:200] or "article"


def estimate_reading_time(content: str) -> int:
    words = len(re.findall(r"\w+", content))
    return max(1, math.ceil(words / 210))


def _is_valid_image_magic(content: bytes, ext: str) -> bool:
    if ext == ".png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if ext in (".jpg", ".jpeg"):
        return content.startswith(b"\xff\xd8\xff")
    if ext == ".webp":
        return len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"
    return False


async def save_blog_cover_image(file: UploadFile) -> str:
    settings = get_settings()
    media_dir = Path(settings.UPLOAD_DIR).resolve() / _BLOG_MEDIA_SUBDIR
    media_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "cover.png").suffix.lower()
    if ext not in _ALLOWED_IMAGE_EXT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cover image must be PNG, JPG, or WEBP.",
        )

    max_bytes = 6 * 1024 * 1024
    raw = await file.read(max_bytes + 1)
    if len(raw) > max_bytes or not raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cover image must be non-empty and under 6 MB.",
        )
    if not _is_valid_image_magic(raw, ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file bytes do not match an allowed image format.",
        )

    import uuid

    fname = f"cover_{uuid.uuid4().hex[:16]}{ext}"
    target = (media_dir / fname).resolve()
    if not target.is_relative_to(media_dir):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")
    target.write_bytes(raw)
    return f"/api/v1/blog/media/{fname}"


def resolve_blog_media_path(filename: str) -> Path:
    settings = get_settings()
    media_dir = (Path(settings.UPLOAD_DIR).resolve() / _BLOG_MEDIA_SUBDIR).resolve()
    safe_name = Path(filename).name
    target = (media_dir / safe_name).resolve()
    if not target.is_relative_to(media_dir) or not target.exists() or not target.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cover image not found.")
    return target


async def list_blog_posts(
    db: AsyncSession,
    *,
    category: Optional[str] = None,
    search: Optional[str] = None,
    featured_only: bool = False,
    include_drafts: bool = False,
    limit: int = 50,
) -> list[BlogPost]:
    stmt = select(BlogPost)
    if not include_drafts:
        stmt = stmt.where(BlogPost.status == "published")
    if category and category.lower() != "all":
        stmt = stmt.where(func.lower(BlogPost.category) == category.strip().lower())
    if featured_only:
        stmt = stmt.where(BlogPost.is_featured.is_(True))
    if search and search.strip():
        q = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(BlogPost.title).like(q),
                func.lower(BlogPost.excerpt).like(q),
                func.lower(BlogPost.category).like(q),
            )
        )
    stmt = stmt.order_by(
        BlogPost.is_featured.desc(),
        BlogPost.published_at.desc(),
        BlogPost.created_at.desc(),
    ).limit(max(1, min(limit, 100)))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_blog_post_detail(db: AsyncSession, slug: str) -> BlogDetailResponse:
    result = await db.execute(
        select(BlogPost).where(BlogPost.slug == slug, BlogPost.status == "published")
    )
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found.")

    all_published = await list_blog_posts(db, include_drafts=False, limit=100)
    idx = next((i for i, p in enumerate(all_published) if p.id == post.id), -1)
    prev_post = all_published[idx - 1] if idx > 0 else None
    next_post = all_published[idx + 1] if 0 <= idx < len(all_published) - 1 else None

    related = [
        p for p in all_published if p.id != post.id and p.category == post.category
    ][:3]
    if len(related) < 3:
        extra = [p for p in all_published if p.id != post.id and p not in related]
        related.extend(extra[: 3 - len(related)])

    return BlogDetailResponse(
        post=BlogPostResponse.model_validate(post),
        related=[BlogPostResponse.model_validate(r) for r in related],
        previous_post=BlogPostResponse.model_validate(prev_post) if prev_post else None,
        next_post=BlogPostResponse.model_validate(next_post) if next_post else None,
    )


async def create_blog_post(
    db: AsyncSession, author: User, payload: BlogPostCreate
) -> BlogPost:
    base_slug = slugify(payload.slug or payload.title)
    candidate = base_slug
    counter = 2
    while True:
        exists = await db.execute(select(BlogPost.id).where(BlogPost.slug == candidate))
        if exists.scalar_one_or_none() is None:
            break
        candidate = f"{base_slug}-{counter}"
        counter += 1

    now = utcnow()
    post = BlogPost(
        title=payload.title.strip(),
        slug=candidate,
        excerpt=payload.excerpt.strip(),
        content=payload.content.strip(),
        cover_image_url=payload.cover_image_url,
        category=payload.category.strip(),
        tags=[t.strip() for t in payload.tags if t.strip()],
        author_name=(payload.author_name or author.full_name or "SURaj AI Editorial Team").strip(),
        author_id=author.id,
        reading_time_minutes=estimate_reading_time(payload.content),
        status=payload.status,
        is_featured=payload.is_featured,
        seo_title=(payload.seo_title or payload.title).strip()[:220],
        seo_description=(payload.seo_description or payload.excerpt).strip()[:320],
        published_at=now if payload.status == "published" else None,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


async def update_blog_post(
    db: AsyncSession, post_id: UUID, payload: BlogPostUpdate
) -> BlogPost:
    result = await db.execute(select(BlogPost).where(BlogPost.id == post_id))
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog post not found.")

    if payload.title is not None:
        post.title = payload.title.strip()
    if payload.slug is not None and payload.slug.strip():
        new_slug = slugify(payload.slug)
        dup = await db.execute(
            select(BlogPost.id).where(BlogPost.slug == new_slug, BlogPost.id != post_id)
        )
        if dup.scalar_one_or_none() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists.")
        post.slug = new_slug
    if payload.excerpt is not None:
        post.excerpt = payload.excerpt.strip()
    if payload.content is not None:
        post.content = payload.content.strip()
        post.reading_time_minutes = estimate_reading_time(post.content)
    if payload.cover_image_url is not None:
        post.cover_image_url = payload.cover_image_url
    if payload.category is not None:
        post.category = payload.category.strip()
    if payload.tags is not None:
        post.tags = [t.strip() for t in payload.tags if t.strip()]
    if payload.author_name is not None:
        post.author_name = payload.author_name.strip()
    if payload.is_featured is not None:
        post.is_featured = payload.is_featured
    if payload.seo_title is not None:
        post.seo_title = payload.seo_title.strip()
    if payload.seo_description is not None:
        post.seo_description = payload.seo_description.strip()
    if payload.status is not None:
        post.status = payload.status
        if payload.status == "published" and post.published_at is None:
            post.published_at = utcnow()

    await db.commit()
    await db.refresh(post)
    return post


async def delete_blog_post(db: AsyncSession, post_id: UUID) -> None:
    result = await db.execute(select(BlogPost).where(BlogPost.id == post_id))
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog post not found.")
    await db.delete(post)
    await db.commit()


_SEED_ARTICLES: list[dict] = [
    {
        "title": "Inside SURaj AI Architecture: Multi-Provider Streaming, Knowledge RAG, and Persistent Memory",
        "slug": "inside-suraj-ai-architecture-rag-memory",
        "category": "SURaj AI Product Updates",
        "is_featured": True,
        "tags": ["FastAPI", "Next.js", "SSE", "RAG", "Architecture"],
        "excerpt": "A technical walkthrough of how SURaj AI coordinates multi-provider LLM streaming, document chunk retrieval, persistent user memory, and Redis rate limiting.",
        "content": """## Overview

Modern AI applications require far more than a single prompt box wired to an API key. **SURaj AI** separates presentation, stateful orchestration, retrieval, and provider transport into clean boundaries built on Next.js 15 and Python FastAPI.

## 1. Multi-Provider Unified Streaming

Rather than locking users to one vendor, SURaj AI normalizes Server-Sent Events (SSE) streams from OpenAI, Google Gemini, and Anthropic Claude behind a single backend interface. Client requests emit `meta`, `delta`, `error`, and `done` events without ever exposing secret provider keys to the browser.

```python
async for chunk in stream_chat_completion(provider=provider, model=model, messages=messages):
    if chunk.delta:
        yield _sse_event("delta", {"text": chunk.delta})
```

## 2. Context-Aware Document RAG Pipeline

When users upload PDFs, CSVs, Excel workbooks, JSON configs, or source files, text extraction runs deterministically on the backend. During chat turns, `rag_service.py` splits large documents into overlapping windows and ranks sections against the active query so answers cite exact sections (`[Source: filename | Section N]`).

## 3. Persistent User Memory vs. Session Context

SURaj AI separates ephemeral turn history from explicit **Persistent User Memory** stored in `user_memories`. Users control what preferences, project rules, or domain facts remain active across conversations.

## 4. Production Hardening

- **Async Alembic Migrations** across PostgreSQL and SQLite
- **Distributed Redis Rate Limiting** for per-minute requests and daily token quotas
- **Zero-Trust Validation** for file uploads, path traversal prevention, and role-based admin controls
""",
    },
    {
        "title": "Designing Reliable Knowledge RAG Pipelines Without Hallucinated Citations",
        "slug": "designing-reliable-knowledge-rag-pipelines",
        "category": "RAG and Vector Databases",
        "is_featured": False,
        "tags": ["RAG", "Chunking", "Document Intelligence", "Citations"],
        "excerpt": "Practical engineering principles for document chunking, overlap windows, lexical/semantic hybrid ranking, and strict source attribution.",
        "content": """## Why Naive File Stuffing Fails

Pasting an entire 80-page PDF into a system prompt wastes context tokens, increases first-token latency, and dilutes model attention across irrelevant sections.

## Overlapping Chunk Windows

Effective Retrieval-Augmented Generation (RAG) begins with clean segmentation:

1. Extract structured text cleanly per page or sheet.
2. Split into bounded chunks (for example, 1,000–1,400 characters) with 15% overlap so definitions spanning boundaries are never severed.
3. Preserve metadata (`filename`, `section_index`) on every candidate chunk.

## Strict Grounding Prompts

Even strong models guess when context is ambiguous. Combining retrieved excerpts with explicit grounding rules—requiring `[Source: filename | Section N]` markers and instructing the model to state when evidence is missing—dramatically reduces fabricated claims.

## Evaluating Retrieval Quality

Before tuning prompts, inspect the retrieved chunks directly for representative user queries. Most RAG accuracy issues trace back to noisy extraction or missing overlap rather than the language model itself.
""",
    },
    {
        "title": "Production AI Security: Protecting API Keys, Uploads, and Rate Limits in FastAPI",
        "slug": "production-ai-security-fastapi",
        "category": "AI Security",
        "is_featured": False,
        "tags": ["Security", "FastAPI", "Redis", "JWT", "Rate Limiting"],
        "excerpt": "Essential defensive engineering patterns for SaaS AI backends: server-side key isolation, upload magic-byte checks, HMAC OTP storage, and Redis limiters.",
        "content": """## Never Trust the Browser With Provider Keys

Any secret bundled into client JavaScript or `NEXT_PUBLIC_*` environment variables is public. Keep OpenAI, Gemini, Anthropic, and SMTP credentials strictly inside server-side environment configuration and verify capability state over an unprivileged status endpoint.

## Hardening File Uploads

- Enforce streaming byte limits before writing files to disk.
- Sanitize uploaded filenames across both Windows and POSIX path separators.
- Verify image headers (magic bytes) rather than trusting client-supplied MIME headers.
- Scope attachment downloads and reads by authenticated `user_id` ownership.

## Cryptographic OTP & Distributed Rate Limits

When implementing verification codes, generate OTPs using `secrets.randbelow`, store only salted/HMAC hashes with short expiration windows and strict attempt caps, and back sliding-window rate limits with Redis so limits hold across multiple worker processes.
""",
    },
    {
        "title": "Prompt Engineering for Structured Outputs: Diagrams, Charts, and Multilingual Clarity",
        "slug": "prompt-engineering-structured-outputs",
        "category": "Prompt Engineering",
        "is_featured": False,
        "tags": ["Prompt Engineering", "Mermaid", "Recharts", "Multilingual"],
        "excerpt": "How system instructions guide LLMs to emit valid Mermaid flowcharts, typed JSON chart schemas, and natural English or Hindi explanations.",
        "content": """## Clear Output Contracts Beat Vague Requests

When asking a model for a visual chart or diagram, ambiguity produces brittle formatting. Defining an explicit fenced schema lets the frontend render interactive Recharts visualizations safely while falling back gracefully if JSON is incomplete mid-stream.

## Handling Multilingual Conversations

Respecting user language—whether English, हिन्दी (Devanagari), or Hinglish—requires separating technical identifiers (variable names, code syntax, CLI flags) from natural-language explanations. Keep code comments crisp and localize conceptual walkthroughs accurately.

## Defensive Rendering on the Client

Never trust model-generated Markdown or SVG output blindly: validate Mermaid syntax prior to DOM injection and sanitize rendered links and HTML nodes against XSS vectors.
""",
    },
    {
        "title": "Async Python Development Patterns With FastAPI, SQLAlchemy 2.0, and Alembic",
        "slug": "async-python-fastapi-sqlalchemy-alembic",
        "category": "Python Development",
        "is_featured": False,
        "tags": ["Python", "FastAPI", "SQLAlchemy", "Alembic", "PostgreSQL"],
        "excerpt": "Structuring async database sessions, streaming generators, and cross-dialect migrations across PostgreSQL and SQLite.",
        "content": """## Avoiding Session Leaks in Streaming Responses

A common FastAPI pitfall occurs when an endpoint injects `Depends(get_db)` and returns a `StreamingResponse` generator that continues running after the request scope closes. Always finish dependency-scoped validation *before* returning the stream, then open short-lived async sessions inside the generator for final persistence.

## Cross-Dialect Migrations

Supporting both PostgreSQL in production (`postgresql+asyncpg`) and SQLite locally (`sqlite+aiosqlite`) is straightforward when using SQLAlchemy 2.0 type variants such as `JSON().with_variant(JSONB(), "postgresql")` combined with Alembic `render_as_batch=True` for SQLite alterations.
""",
    },
    {
        "title": "AI Coding Assistants & Automated Testing: Pairing Velocity With Deterministic Verification",
        "slug": "ai-coding-assistants-automated-testing",
        "category": "AI Coding",
        "is_featured": False,
        "tags": ["AI Coding", "Testing", "Playwright", "Pytest", "TypeScript"],
        "excerpt": "Why combining static TypeScript checks, unit tests, and real end-to-end Playwright browser suites turns AI-assisted coding into production engineering.",
        "content": """## Generation Is Not Verification

Modern LLMs can scaffold components and API routes rapidly, yet subtle bugs—stale closures, mobile overflow at 320px, missing authorization checks, or unawaited async streams—only surface under rigorous verification.

## A Practical Verification Pyramid

1. **Static Analysis:** `tsc --noEmit` and ESLint catch contract drift early.
2. **Backend Integration Tests:** `pytest` exercises auth isolation, database persistence, and error statuses with real HTTP transport.
3. **End-to-End Browser Runs:** Headless Chromium validates hydration, responsive viewports, dark/light theming, and streaming UX under real conditions.
""",
    },
]


async def seed_initial_blog_posts(db: AsyncSession) -> None:
    count_q = await db.execute(select(func.count(BlogPost.id)))
    existing_count = int(count_q.scalar_one() or 0)
    if existing_count > 0:
        return

    now = utcnow()
    for item in _SEED_ARTICLES:
        post = BlogPost(
            title=item["title"],
            slug=item["slug"],
            excerpt=item["excerpt"],
            content=item["content"],
            category=item["category"],
            tags=item["tags"],
            author_name="SURaj AI Engineering Team",
            reading_time_minutes=estimate_reading_time(item["content"]),
            status="published",
            is_featured=item["is_featured"],
            seo_title=item["title"],
            seo_description=item["excerpt"],
            published_at=now,
        )
        db.add(post)
    await db.commit()
