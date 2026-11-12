import re
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import (
    admin,
    auth,
    billing,
    blog,
    chat,
    contact,
    conversations,
    files,
    health,
    images,
    memories,
    newsletter,
    settings,
    tools,
    usage,
)
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal, engine, init_db
from app.core.logging import configure_logging, get_logger, mask_secret, request_id_ctx
from app.core.monitoring import metrics
from app.services.blog_service import seed_initial_blog_posts
from app.services.rate_limit_service import close_redis_client

app_settings = get_settings()
configure_logging(
    debug=app_settings.DEBUG,
    json_logs=app_settings.is_production or not app_settings.DEBUG,
)
logger = get_logger("main")

_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info(
        "Starting %s (env=%s, debug=%s, redis=%s, openai=%s, gemini=%s, anthropic=%s)",
        app_settings.APP_NAME,
        app_settings.APP_ENV,
        app_settings.DEBUG,
        "configured" if app_settings.has_redis_configured else "not-configured",
        mask_secret(app_settings.OPENAI_API_KEY),
        mask_secret(app_settings.GEMINI_API_KEY),
        mask_secret(app_settings.ANTHROPIC_API_KEY),
    )
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed_initial_blog_posts(db)
    yield
    await close_redis_client()
    await engine.dispose()
    logger.info("Shutting down %s", app_settings.APP_NAME)


app = FastAPI(
    title=app_settings.APP_NAME,
    version="1.1.0",
    description="SURaj AI Production Backend API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID", "Retry-After"],
)


@app.middleware("http")
async def request_context_and_security_middleware(request: Request, call_next):
    raw_id = request.headers.get("X-Request-ID", "").strip()
    req_id = raw_id if raw_id and _REQUEST_ID_RE.match(raw_id) else uuid.uuid4().hex
    token = request_id_ctx.set(req_id)
    request.state.request_id = req_id
    start = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        metrics.record_http_request(
            method=request.method,
            path=request.url.path,
            status_code=500,
            latency_ms=elapsed_ms,
            request_id=req_id,
            error_type=type(exc).__name__,
        )
        logger.exception("Unhandled error on %s %s (%dms)", request.method, request.url.path, elapsed_ms)
        request_id_ctx.reset(token)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": req_id},
            headers={"X-Request-ID": req_id},
        )

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    metrics.record_http_request(
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        latency_ms=elapsed_ms,
        request_id=req_id,
    )
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["X-XSS-Protection"] = "0"
    if app_settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    logger.info(
        "%s %s -> %s (%dms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    request_id_ctx.reset(token)
    return response


app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(conversations.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(files.router, prefix="/api/v1")
app.include_router(images.router, prefix="/api/v1")
app.include_router(memories.router, prefix="/api/v1")
app.include_router(newsletter.router, prefix="/api/v1")
app.include_router(blog.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(contact.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(settings.router, prefix="/api/v1")
app.include_router(tools.router, prefix="/api/v1")
app.include_router(usage.router, prefix="/api/v1")
