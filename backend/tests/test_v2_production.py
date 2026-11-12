import os
import sqlite3
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError
from redis.exceptions import ConnectionError as RedisConnectionError

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_suraj_ai.db"
os.environ["OPENAI_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""
os.environ["ANTHROPIC_API_KEY"] = ""

from app.core.config import Settings, get_settings  # noqa: E402
from app.core.database import AsyncSessionLocal, Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services import rate_limit_service  # noqa: E402


class FakePipeline:
    def __init__(self, redis: "FakeAsyncRedis") -> None:
        self._redis = redis
        self._ops: list[tuple] = []

    def incrby(self, key: str, amount: int) -> "FakePipeline":
        self._ops.append(("incrby", key, amount))
        return self

    def expire(self, key: str, ttl: int) -> "FakePipeline":
        self._ops.append(("expire", key, ttl))
        return self

    async def execute(self) -> list[int]:
        results: list[int] = []
        for op in self._ops:
            if op[0] == "incrby":
                cur = int(self._redis.kv.get(op[1], "0")) + int(op[2])
                self._redis.kv[op[1]] = str(cur)
                results.append(cur)
            elif op[0] == "expire":
                results.append(1)
        self._ops.clear()
        return results


class FakeAsyncRedis:
    """In-memory async Redis stand-in for testing distributed rate limit logic."""

    def __init__(self, fail_next: bool = False) -> None:
        self.zsets: dict[str, dict[str, float]] = {}
        self.kv: dict[str, str] = {}
        self.fail_next = fail_next
        self.eval_calls = 0

    async def ping(self) -> bool:
        if self.fail_next:
            raise RedisConnectionError("Simulated Redis outage")
        return True

    async def get(self, key: str):
        if self.fail_next:
            raise RedisConnectionError("Simulated Redis outage")
        return self.kv.get(key)

    async def set(self, key: str, value: str, ex: int | None = None) -> bool:
        if self.fail_next:
            raise RedisConnectionError("Simulated Redis outage")
        self.kv[key] = str(value)
        return True

    def pipeline(self, transaction: bool = False) -> FakePipeline:
        return FakePipeline(self)

    async def eval(self, script: str, numkeys: int, key: str, now_s: str, window_s: str, limit_s: str, member: str):
        if self.fail_next:
            raise RedisConnectionError("Simulated Redis outage")
        self.eval_calls += 1
        now = float(now_s)
        window = int(float(window_s))
        limit = int(float(limit_s))
        cutoff = now - window
        bucket = self.zsets.setdefault(key, {})
        for m in [k for k, score in bucket.items() if score < cutoff]:
            del bucket[m]
        if len(bucket) >= limit:
            oldest = min(bucket.values())
            retry_after = max(1, int(window - (now - oldest)) + 1)
            return [0, retry_after]
        bucket[member] = now
        return [1, 0]

    async def aclose(self) -> None:
        return None


@pytest.fixture(autouse=True)
async def reset_db_v2():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    rate_limit_service.rate_limiter._buckets.clear()
    yield


def test_production_config_validation():
    # Rejects default/weak SECRET_KEY in production
    with pytest.raises(ValidationError):
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY="dev-only-change-this-secret-key-before-production-deployment",
        )

    # Rejects DEBUG=True in production
    with pytest.raises(ValidationError):
        Settings(
            APP_ENV="production",
            DEBUG=True,
            SECRET_KEY="x" * 48,
        )

    # Accepts valid hardened production settings
    prod = Settings(
        APP_ENV="production",
        DEBUG=False,
        SECRET_KEY="a9F#kL2!mN8$pQ4^rT7&vW1*zY5(bC3)dE6_gH0+",
        REDIS_URL="redis://redis:6379/0",
    )
    assert prod.is_production is True
    assert prod.allow_rate_limit_dev_fallback is False


@pytest.mark.asyncio
async def test_security_headers_request_id_and_health_metrics():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/health", headers={"X-Request-ID": "trace-qa-123"})
        assert res.status_code == 200
        assert res.headers["X-Request-ID"] == "trace-qa-123"
        assert res.headers["X-Content-Type-Options"] == "nosniff"
        assert res.headers["X-Frame-Options"] == "DENY"
        assert res.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
        assert res.headers["X-XSS-Protection"] == "0"

        body = res.json()
        assert body["status"] == "ok"
        assert body["database_connected"] is True
        assert "redis_status" in body
        assert body["metrics"]["total_requests"] >= 1
        assert "providers" in body["metrics"]

        # Malicious/invalid inbound X-Request-ID is replaced cleanly
        bad_id_res = await client.get("/api/v1/health", headers={"X-Request-ID": "bad id\r\ninject"})
        assert bad_id_res.status_code == 200
        assert bad_id_res.headers["X-Request-ID"] != "bad id\r\ninject"
        assert len(bad_id_res.headers["X-Request-ID"]) == 32


@pytest.mark.asyncio
async def test_redis_distributed_rate_limit_and_outage_handling():
    fake_redis = FakeAsyncRedis()
    settings = get_settings()
    orig_rpm = settings.RATE_LIMIT_REQUESTS_PER_MINUTE
    orig_daily = settings.RATE_LIMIT_DAILY_TOKENS
    orig_redis_url = settings.REDIS_URL
    orig_fallback = settings.RATE_LIMIT_DEV_FALLBACK

    settings.REDIS_URL = "redis://fake-redis:6379/0"
    settings.RATE_LIMIT_REQUESTS_PER_MINUTE = 2
    settings.RATE_LIMIT_DAILY_TOKENS = 100

    uid = uuid.uuid4()
    try:
        with patch.object(rate_limit_service, "get_redis_client", return_value=fake_redis):
            async with AsyncSessionLocal() as db:
                # Create user first so FK constraints hold cleanly
                from app.models.models import User

                db.add(
                    User(
                        id=uid,
                        email="redis-test@example.com",
                        full_name="Redis Tester",
                        password_hash="hash",
                    )
                )
                await db.commit()

                # 2 requests pass via Redis Lua eval
                await rate_limit_service.check_user_limits(db, uid)
                await rate_limit_service.check_user_limits(db, uid)
                assert fake_redis.eval_calls == 2

                # 3rd request blocked with 429 + Retry-After
                with pytest.raises(Exception) as exc:
                    await rate_limit_service.check_user_limits(db, uid)
                assert getattr(exc.value, "status_code", None) == 429
                assert "Retry-After" in getattr(exc.value, "headers", {})

                # Daily token tracking increments Redis counter & enforces daily limit
                fake_redis.zsets.clear()
                await rate_limit_service.record_usage(
                    db,
                    user_id=uid,
                    conversation_id=None,
                    action_type="chat",
                    provider="openai",
                    model="gpt-4o-mini",
                    total_tokens=120,
                )
                with pytest.raises(Exception) as tok_exc:
                    await rate_limit_service.check_user_limits(db, uid)
                assert getattr(tok_exc.value, "status_code", None) == 429

                # Redis outage with dev fallback enabled degrades cleanly to in-memory limiter
                fake_redis.fail_next = True
                settings.RATE_LIMIT_DAILY_TOKENS = 250000
                settings.RATE_LIMIT_DEV_FALLBACK = True
                await rate_limit_service.check_user_limits(db, uid)

                # Redis outage with fallback disabled fails closed with 503 Retry-After
                settings.RATE_LIMIT_DEV_FALLBACK = False
                with pytest.raises(Exception) as outage_exc:
                    await rate_limit_service.check_user_limits(db, uid)
                assert getattr(outage_exc.value, "status_code", None) == 503
                assert outage_exc.value.headers["Retry-After"] == "5"
    finally:
        settings.RATE_LIMIT_REQUESTS_PER_MINUTE = orig_rpm
        settings.RATE_LIMIT_DAILY_TOKENS = orig_daily
        settings.REDIS_URL = orig_redis_url
        settings.RATE_LIMIT_DEV_FALLBACK = orig_fallback


def test_alembic_upgrade_data_preservation_and_downgrade():
    backend_dir = Path(__file__).resolve().parents[1]
    tmp_dir = Path(tempfile.mkdtemp(prefix="suraj_alembic_"))
    db_file = tmp_dir / "mig.db"
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_file.as_posix()}"

    up = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=str(backend_dir),
        env=env,
        capture_output=True,
        text=True,
    )
    assert up.returncode == 0, up.stderr

    # Verify schema tables created + insert row to check idempotent upgrade preserves data
    conn = sqlite3.connect(db_file)
    tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    assert {"users", "user_preferences", "conversations", "messages", "attachments", "usage_records", "alembic_version"}.issubset(tables)
    conn.execute(
        "INSERT INTO users (id, email, full_name, password_hash, is_active, role, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, 1, 'user', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
        (uuid.uuid4().hex, "keep@example.com", "Keep User", "hashed"),
    )
    conn.commit()
    conn.close()

    # Re-running upgrade head preserves existing rows
    up2 = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=str(backend_dir),
        env=env,
        capture_output=True,
        text=True,
    )
    assert up2.returncode == 0, up2.stderr

    conn = sqlite3.connect(db_file)
    count = conn.execute("SELECT COUNT(*) FROM users WHERE email='keep@example.com'").fetchone()[0]
    conn.close()
    assert count == 1

    # Verify downgrade base succeeds cleanly
    down = subprocess.run(
        [sys.executable, "-m", "alembic", "downgrade", "base"],
        cwd=str(backend_dir),
        env=env,
        capture_output=True,
        text=True,
    )
    assert down.returncode == 0, down.stderr

