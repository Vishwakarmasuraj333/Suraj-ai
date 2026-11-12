import os
import re
import tempfile
from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import update

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_suraj_ai.db"
os.environ["UPLOAD_DIR"] = tempfile.mkdtemp(prefix="suraj_uploads_")
os.environ["OPENAI_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""
os.environ["ANTHROPIC_API_KEY"] = ""

from app.core.config import get_settings  # noqa: E402
from app.core.database import AsyncSessionLocal, Base, engine  # noqa: E402
from app.core.logging import get_logger  # noqa: E402
from app.main import app  # noqa: E402
from app.models.models import User  # noqa: E402
from app.services.blog_service import seed_initial_blog_posts  # noqa: E402
from app.services.rag_service import retrieve_relevant_chunks  # noqa: E402


@pytest.fixture(autouse=True)
async def reset_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.mark.asyncio
async def test_signup_validation_and_blocked_otp_without_smtp():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Password mismatch
        mismatch = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "u1@example.com",
                "full_name": "User One",
                "password": "StrongPass123",
                "confirm_password": "DifferentPass123",
                "accept_terms": True,
            },
        )
        assert mismatch.status_code == 422

        # Terms not accepted
        no_terms = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "u1@example.com",
                "full_name": "User One",
                "password": "StrongPass123",
                "confirm_password": "StrongPass123",
                "accept_terms": False,
            },
        )
        assert no_terms.status_code == 400

        # Weak password (no digit)
        weak = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "u1@example.com",
                "full_name": "User One",
                "password": "OnlyLettersPassword",
                "confirm_password": "OnlyLettersPassword",
                "accept_terms": True,
            },
        )
        assert weak.status_code == 422

        # Valid signup
        ok = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "u1@example.com",
                "full_name": "User One",
                "password": "StrongPass123",
                "confirm_password": "StrongPass123",
                "accept_terms": True,
            },
        )
        assert ok.status_code == 201
        assert ok.json()["email_verification_status"] == "unverified_pending_otp"

        # Honest 503 BLOCKED when SMTP not configured
        otp_res = await client.post(
            "/api/v1/auth/send-otp",
            json={"email": "u1@example.com", "purpose": "verify_email"},
        )
        assert otp_res.status_code == 503
        assert otp_res.json()["detail"]["code"] == "EMAIL_PROVIDER_NOT_CONFIGURED"


@pytest.mark.asyncio
async def test_otp_lifecycle_forgot_reset_and_change_password(monkeypatch):
    settings = get_settings()
    orig_host = settings.SMTP_HOST
    orig_user = settings.SMTP_USER
    orig_pass = settings.SMTP_PASSWORD
    orig_from = settings.SMTP_FROM_EMAIL
    orig_cool = settings.EMAIL_OTP_RESEND_COOLDOWN_SECONDS

    sent_messages: list[dict] = []

    def fake_send_smtp_sync(*, to_email: str, subject: str, plain_body: str, html_body=None):
        sent_messages.append({"to": to_email, "subject": subject, "body": plain_body})

    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(settings, "SMTP_USER", "apikey")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "secret")
    monkeypatch.setattr(settings, "SMTP_FROM_EMAIL", "noreply@suraj-ai.local")
    monkeypatch.setattr(settings, "EMAIL_OTP_RESEND_COOLDOWN_SECONDS", 60)
    monkeypatch.setattr("app.services.email_service._send_smtp_sync", fake_send_smtp_sync)

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            signup = await client.post(
                "/api/v1/auth/signup",
                json={
                    "email": "otpuser@example.com",
                    "full_name": "OTP User",
                    "password": "InitialPass123",
                    "confirm_password": "InitialPass123",
                    "accept_terms": True,
                    "request_otp": True,
                },
            )
            assert signup.status_code == 201
            assert signup.json()["email_verification_status"] == "otp_sent"
            assert len(sent_messages) == 1
            match = re.search(r"(\d{6})", sent_messages[-1]["body"])
            assert match is not None
            code = match.group(1)

            # Resend within cooldown blocked with 429
            cooldown_hit = await client.post(
                "/api/v1/auth/send-otp",
                json={"email": "otpuser@example.com", "purpose": "verify_email"},
            )
            assert cooldown_hit.status_code == 429

            # Wrong code rejected
            bad_code = "000000" if code != "000000" else "999999"
            bad_verify = await client.post(
                "/api/v1/auth/verify-otp",
                json={"email": "otpuser@example.com", "otp": bad_code, "purpose": "verify_email"},
            )
            assert bad_verify.status_code == 400

            # Correct code verifies user
            ok_verify = await client.post(
                "/api/v1/auth/verify-otp",
                json={"email": "otpuser@example.com", "otp": code, "purpose": "verify_email"},
            )
            assert ok_verify.status_code == 200
            assert ok_verify.json()["verified"] is True

            # Reuse blocked
            reuse_verify = await client.post(
                "/api/v1/auth/verify-otp",
                json={"email": "otpuser@example.com", "otp": code, "purpose": "verify_email"},
            )
            assert reuse_verify.status_code == 400

            # Forgot password sends reset OTP
            forgot = await client.post(
                "/api/v1/auth/forgot-password",
                json={"email": "otpuser@example.com"},
            )
            assert forgot.status_code == 200
            assert len(sent_messages) == 2
            reset_code = re.search(r"(\d{6})", sent_messages[-1]["body"]).group(1)

            reset = await client.post(
                "/api/v1/auth/reset-password",
                json={
                    "email": "otpuser@example.com",
                    "otp": reset_code,
                    "new_password": "ResetPass456",
                    "confirm_password": "ResetPass456",
                },
            )
            assert reset.status_code == 200
            assert reset.json()["reset"] is True

            # Login with new password
            login = await client.post(
                "/api/v1/auth/login",
                json={"email": "otpuser@example.com", "password": "ResetPass456"},
            )
            assert login.status_code == 200
            headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
            assert login.json()["user"]["is_email_verified"] is True

            # Change password while logged in
            change = await client.post(
                "/api/v1/auth/change-password",
                headers=headers,
                json={
                    "current_password": "ResetPass456",
                    "new_password": "FinalPass789",
                    "confirm_password": "FinalPass789",
                },
            )
            assert change.status_code == 200
            login_final = await client.post(
                "/api/v1/auth/login",
                json={"email": "otpuser@example.com", "password": "FinalPass789"},
            )
            assert login_final.status_code == 200
    finally:
        settings.SMTP_HOST = orig_host
        settings.SMTP_USER = orig_user
        settings.SMTP_PASSWORD = orig_pass
        settings.SMTP_FROM_EMAIL = orig_from
        settings.EMAIL_OTP_RESEND_COOLDOWN_SECONDS = orig_cool


@pytest.mark.asyncio
async def test_memories_crud_isolation_and_rag_chunking():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        s1 = await client.post(
            "/api/v1/auth/signup",
            json={"email": "mem1@example.com", "full_name": "M1", "password": "StrongPass123"},
        )
        s2 = await client.post(
            "/api/v1/auth/signup",
            json={"email": "mem2@example.com", "full_name": "M2", "password": "StrongPass123"},
        )
        h1 = {"Authorization": f"Bearer {s1.json()['access_token']}"}
        h2 = {"Authorization": f"Bearer {s2.json()['access_token']}"}

        created = await client.post(
            "/api/v1/memories",
            headers=h1,
            json={
                "title": "Stack Preference",
                "content": "Always answer FastAPI questions with async SQLAlchemy 2.0 examples.",
                "category": "preference",
            },
        )
        assert created.status_code == 201
        mem_id = created.json()["id"]

        listed = await client.get("/api/v1/memories", headers=h1)
        assert listed.status_code == 200
        assert len(listed.json()) == 1

        # Cross-user access denied
        other_patch = await client.patch(
            f"/api/v1/memories/{mem_id}",
            headers=h2,
            json={"is_active": False},
        )
        assert other_patch.status_code == 404

        patched = await client.patch(
            f"/api/v1/memories/{mem_id}",
            headers=h1,
            json={"is_active": False},
        )
        assert patched.status_code == 200
        assert patched.json()["is_active"] is False

        deleted = await client.delete(f"/api/v1/memories/{mem_id}", headers=h1)
        assert deleted.status_code == 204

    # RAG retrieval ranks matching sections cleanly
    docs = [
        SimpleNamespace(
            filename="architecture.md",
            extracted_text=(
                "PostgreSQL asyncpg pool configuration ensures low latency.\n\n"
                + "Kubernetes HPA scales stateless FastAPI workers cleanly.\n\n"
                + "Redis distributed sliding window rate limits enforce RPM and daily tokens."
            ),
        )
    ]
    chunks = retrieve_relevant_chunks("How does Redis rate limit work?", docs, top_k=2)
    assert len(chunks) >= 1
    assert any("Redis" in c.text and c.filename == "architecture.md" for c in chunks)


@pytest.mark.asyncio
async def test_blog_billing_contact_and_admin_rbac():
    async with AsyncSessionLocal() as session:
        await seed_initial_blog_posts(session)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Public blog categories + seeded posts
        cats = await client.get("/api/v1/blog/categories")
        assert cats.status_code == 200
        assert len(cats.json()) == 14

        posts = await client.get("/api/v1/blog/posts")
        assert posts.status_code == 200
        assert len(posts.json()) >= 6
        first_slug = posts.json()[0]["slug"]

        detail = await client.get(f"/api/v1/blog/posts/{first_slug}")
        assert detail.status_code == 200
        assert detail.json()["post"]["slug"] == first_slug

        # Public contact submission + honeypot check
        contact_ok = await client.post(
            "/api/v1/contact",
            json={
                "name": "Jane Doe",
                "email": "jane@example.com",
                "subject": "Enterprise Architecture Inquiry",
                "message": "We would like to discuss private VPC deployment for SURaj AI.",
                "website": "",
            },
        )
        assert contact_ok.status_code == 201

        spam = await client.post(
            "/api/v1/contact",
            json={
                "name": "Bot",
                "email": "bot@spam.example",
                "subject": "Spam",
                "message": "Buy cheap links now please click here.",
                "website": "http://spam.example",
            },
        )
        assert spam.status_code == 400

        # Regular user cannot access admin endpoints
        user_signup = await client.post(
            "/api/v1/auth/signup",
            json={"email": "regular@example.com", "full_name": "Regular User", "password": "StrongPass123"},
        )
        user_headers = {"Authorization": f"Bearer {user_signup.json()['access_token']}"}
        denied = await client.get("/api/v1/admin/overview", headers=user_headers)
        assert denied.status_code == 403

        # Billing plans + Free checkout + honest 503 on Pro without Stripe/Razorpay
        plans = await client.get("/api/v1/billing/plans")
        assert plans.status_code == 200
        assert len(plans.json()["plans"]) == 4

        free_checkout = await client.post(
            "/api/v1/billing/checkout",
            headers=user_headers,
            json={"plan_tier": "free", "billing_cycle": "monthly"},
        )
        assert free_checkout.status_code == 200

        pro_checkout = await client.post(
            "/api/v1/billing/checkout",
            headers=user_headers,
            json={"plan_tier": "pro", "billing_cycle": "monthly", "provider": "stripe"},
        )
        assert pro_checkout.status_code == 503

        # Promote user to admin in DB and test Admin CMS + logs redaction
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(User).where(User.email == "regular@example.com").values(role="admin")
            )
            await session.commit()

        get_logger("test_redaction").info("Testing secret filter sk-abcdef1234567890abcdef12345")

        overview = await client.get("/api/v1/admin/overview", headers=user_headers)
        assert overview.status_code == 200
        assert overview.json()["counts"]["contact_submissions"] >= 1

        new_post = await client.post(
            "/api/v1/admin/blog/posts",
            headers=user_headers,
            json={
                "title": "Deploying Multi-Provider Knowledge RAG on PostgreSQL",
                "excerpt": "How SURaj AI chunks and ranks uploaded documents reliably without external vector vendor lock-in.",
                "content": "## Overview\n\nSURaj AI indexes extracted text cleanly.\n\n### Chunk Scoring\n\nRelevant sections include inline citations.",
                "category": "Knowledge RAG Systems",
                "tags": ["rag", "postgresql"],
                "status": "published",
                "is_featured": False,
            },
        )
        assert new_post.status_code == 201
        created_id = new_post.json()["id"]

        updated_post = await client.patch(
            f"/api/v1/admin/blog/posts/{created_id}",
            headers=user_headers,
            json={"status": "draft"},
        )
        assert updated_post.status_code == 200
        assert updated_post.json()["status"] == "draft"

        deleted_post = await client.delete(f"/api/v1/admin/blog/posts/{created_id}", headers=user_headers)
        assert deleted_post.status_code == 204

        logs = await client.get("/api/v1/admin/logs", headers=user_headers)
        assert logs.status_code == 200
        assert not any("sk-abcdef1234567890abcdef12345" in entry["message"] for entry in logs.json())


@pytest.mark.asyncio
async def test_newsletter_subscribe_consent_and_unsubscribe():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        no_consent = await client.post(
            "/api/v1/newsletter/subscribe",
            json={"email": "reader@example.com", "consent": False, "website": ""},
        )
        assert no_consent.status_code == 400

        spam = await client.post(
            "/api/v1/newsletter/subscribe",
            json={"email": "bot@example.com", "consent": True, "website": "http://bad.test"},
        )
        assert spam.status_code == 400

        ok = await client.post(
            "/api/v1/newsletter/subscribe",
            json={"email": "reader@example.com", "consent": True, "website": ""},
        )
        assert ok.status_code == 201
        data = ok.json()
        assert data["subscribed"] is True
        assert data["email_sent"] is False
        assert data["email_status"] == "smtp_not_configured"

        unsub = await client.post(
            "/api/v1/newsletter/unsubscribe",
            json={"email": "reader@example.com"},
        )
        assert unsub.status_code == 200
        assert unsub.json()["unsubscribed"] is True
