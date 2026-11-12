import base64
import io
import json
import os
import tempfile
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from jose import jwt
from openpyxl import Workbook
from PIL import Image
from sqlalchemy import select

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_suraj_ai.db"
os.environ["UPLOAD_DIR"] = tempfile.mkdtemp(prefix="suraj_uploads_comp_")
os.environ["OPENAI_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""
os.environ["ANTHROPIC_API_KEY"] = ""

from app.core.config import get_settings  # noqa: E402
from app.core.database import AsyncSessionLocal, Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.models import Attachment, Conversation, Message, UsageRecord, User  # noqa: E402
from app.services.file_processing_service import analyze_file_bytes, sanitize_filename  # noqa: E402
from app.services.llm_provider_service import StreamChunk  # noqa: E402
from app.services.rate_limit_service import rate_limiter  # noqa: E402


def _make_sample_pdf_bytes(text: str = "SURaj AI Quarterly Report 2026") -> bytes:
    """Build a valid single-page PDF containing selectable ASCII text."""
    escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream_content = f"BT /F1 14 Tf 72 720 Td ({escaped}) Tj ET\n".encode("ascii")
    objects = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        (
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
        ),
        (
            f"4 0 obj\n<< /Length {len(stream_content)} >>\nstream\n".encode("ascii")
            + stream_content
            + b"endstream\nendobj\n"
        ),
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    ]
    buf = io.BytesIO()
    buf.write(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(buf.tell())
        buf.write(obj)
    xref_pos = buf.tell()
    buf.write(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    buf.write(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        buf.write(f"{off:010d} 00000 n \n".encode("ascii"))
    buf.write(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("ascii")
    )
    return buf.getvalue()


def _make_sample_xlsx_bytes() -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Revenue"
    ws.append(["Quarter", "Revenue", "Expenses"])
    ws.append(["Q1", 12000, 7000])
    ws.append(["Q2", 18500, 8200])
    out = io.BytesIO()
    wb.save(out)
    wb.close()
    return out.getvalue()


@pytest.fixture(autouse=True)
async def reset_state():
    rate_limiter._buckets.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


async def _signup_user(client: AsyncClient, email: str, name: str = "Test User", password: str = "StrongPass123!"):
    res = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "full_name": name, "password": password},
    )
    assert res.status_code == 201, res.text
    data = res.json()
    return data["user"], {"Authorization": f"Bearer {data['access_token']}"}, data["access_token"]


@pytest.mark.asyncio
async def test_auth_security_and_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Unauthenticated requests rejected
        assert (await client.get("/api/v1/auth/me")).status_code == 401
        assert (await client.get("/api/v1/conversations")).status_code == 401
        assert (await client.post("/api/v1/auth/logout")).status_code == 401

        # Validation failures
        bad_pw = await client.post(
            "/api/v1/auth/signup",
            json={"email": "a@example.com", "full_name": "Ab", "password": "short"},
        )
        assert bad_pw.status_code == 422

        # Signup & duplicate conflict
        user, headers, token = await _signup_user(client, "alpha@example.com", "Alpha User")
        dup = await client.post(
            "/api/v1/auth/signup",
            json={"email": "ALPHA@example.com", "full_name": "Alpha Dup", "password": "StrongPass123!"},
        )
        assert dup.status_code == 409

        # Password stored as bcrypt hash, never plaintext
        async with AsyncSessionLocal() as session:
            db_user = (await session.execute(select(User).where(User.email == "alpha@example.com"))).scalar_one()
            assert db_user.password_hash != "StrongPass123!"
            assert db_user.password_hash.startswith("$2")

        # Invalid login & wrong password
        assert (await client.post("/api/v1/auth/login", json={"email": "alpha@example.com", "password": "wrong"})).status_code == 401
        assert (await client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "StrongPass123!"})).status_code == 401

        # Invalid / tampered / expired JWT
        assert (await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"})).status_code == 401
        expired_token = jwt.encode(
            {"sub": user["id"], "exp": datetime.now(timezone.utc) - timedelta(minutes=5)},
            get_settings().SECRET_KEY,
            algorithm=get_settings().ALGORITHM,
        )
        assert (await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})).status_code == 401

        # Logout endpoint
        logout_res = await client.post("/api/v1/auth/logout", headers=headers)
        assert logout_res.status_code == 200
        assert logout_res.json()["status"] == "logged_out"

        # Deactivated user rejected
        async with AsyncSessionLocal() as session:
            db_user = (await session.execute(select(User).where(User.email == "alpha@example.com"))).scalar_one()
            db_user.is_active = False
            await session.commit()

        assert (await client.get("/api/v1/auth/me", headers=headers)).status_code == 401
        assert (await client.post("/api/v1/auth/login", json={"email": "alpha@example.com", "password": "StrongPass123!"})).status_code == 403


@pytest.mark.asyncio
async def test_user_isolation_sql_injection_and_path_traversal():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        _, headers_a, _ = await _signup_user(client, "usera@example.com", "User A")
        _, headers_b, _ = await _signup_user(client, "userb@example.com", "User B")

        # User A creates conversation and uploads file
        conv_a = (await client.post("/api/v1/conversations", headers=headers_a, json={"title": "Secret Plan"})).json()
        att_a = (
            await client.post(
                "/api/v1/files/upload",
                headers=headers_a,
                files={"file": ("secret.txt", b"Top secret A notes", "text/plain")},
                data={"conversation_id": conv_a["id"]},
            )
        ).json()

        # User B cannot access, modify, delete, upload into, or generate images into User A's resources
        assert (await client.get(f"/api/v1/conversations/{conv_a['id']}", headers=headers_b)).status_code == 404
        assert (await client.patch(f"/api/v1/conversations/{conv_a['id']}", headers=headers_b, json={"title": "Hacked"})).status_code == 404
        assert (await client.delete(f"/api/v1/conversations/{conv_a['id']}", headers=headers_b)).status_code == 404
        assert (await client.get(f"/api/v1/files/{att_a['id']}", headers=headers_b)).status_code == 404
        assert (await client.get(f"/api/v1/files/{att_a['id']}/raw", headers=headers_b)).status_code == 404

        cross_upload = await client.post(
            "/api/v1/files/upload",
            headers=headers_b,
            files={"file": ("b.txt", b"hello", "text/plain")},
            data={"conversation_id": conv_a["id"]},
        )
        assert cross_upload.status_code == 404

        cross_img = await client.post(
            "/api/v1/images/generate",
            headers=headers_b,
            json={"prompt": "A mountain sunrise", "conversation_id": conv_a["id"]},
        )
        assert cross_img.status_code == 404

        # SQL injection attempt in search query returns 0 matches for User B and does not leak User A's chat
        sqli = await client.get("/api/v1/conversations?q=' OR '1'='1", headers=headers_b)
        assert sqli.status_code == 200
        assert sqli.json() == []

        # Path traversal sanitization
        assert sanitize_filename("../../etc/passwd") == "passwd"
        assert sanitize_filename("..\\..\\Windows\\win.ini") == "win.ini"
        assert sanitize_filename("..") == "upload.bin"

        trav = await client.post(
            "/api/v1/files/upload",
            headers=headers_a,
            files={"file": ("../../evil.txt", b"safe content", "text/plain")},
        )
        assert trav.status_code == 201
        assert trav.json()["filename"] == "evil.txt"


@pytest.mark.asyncio
async def test_file_processing_all_types_and_errors():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        _, headers, _ = await _signup_user(client, "files@example.com", "Files User")

        # 1. PDF upload & text extraction
        pdf_bytes = _make_sample_pdf_bytes("SURaj AI Quarterly Report 2026")
        pdf_res = await client.post(
            "/api/v1/files/upload",
            headers=headers,
            files={"file": ("report.pdf", pdf_bytes, "application/pdf")},
        )
        assert pdf_res.status_code == 201
        assert pdf_res.json()["kind"] == "pdf"
        assert "Quarterly Report 2026" in (pdf_res.json()["extracted_text_preview"] or "")

        # 2. XLSX upload & chart profiling
        xlsx_bytes = _make_sample_xlsx_bytes()
        xlsx_res = await client.post(
            "/api/v1/files/upload",
            headers=headers,
            files={"file": ("finance.xlsx", xlsx_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert xlsx_res.status_code == 201
        assert xlsx_res.json()["kind"] == "data"
        assert xlsx_res.json()["analysis_json"]["row_count"] == 2
        assert xlsx_res.json()["analysis_json"]["chart"]["series"] == ["Revenue", "Expenses"]

        # 3. TSV, JSON, TS code
        tsv_res = await client.post(
            "/api/v1/files/upload",
            headers=headers,
            files={"file": ("data.tsv", b"city\tpop\nDelhi\t19000000\n", "text/tab-separated-values")},
        )
        assert tsv_res.status_code == 201
        assert tsv_res.json()["analysis_json"]["row_count"] == 1

        ts_res = await client.post(
            "/api/v1/files/upload",
            headers=headers,
            files={"file": ("util.ts", b"export const add = (a: number, b: number) => a + b;\n", "text/plain")},
        )
        assert ts_res.status_code == 201
        assert ts_res.json()["kind"] == "document"

        # 4. Raw download
        raw_dl = await client.get(f"/api/v1/files/{pdf_res.json()['id']}/raw", headers=headers)
        assert raw_dl.status_code == 200
        assert raw_dl.content.startswith(b"%PDF")

        # 5. Error cases: empty, corrupted PDF/image/xlsx/json, binary CSV, unsupported ext, oversized
        assert (await client.post("/api/v1/files/upload", headers=headers, files={"file": ("empty.txt", b"", "text/plain")})).status_code == 400
        assert (await client.post("/api/v1/files/upload", headers=headers, files={"file": ("bad.pdf", b"not-a-pdf", "application/pdf")})).status_code == 400
        assert (await client.post("/api/v1/files/upload", headers=headers, files={"file": ("bad.png", b"not-an-image", "image/png")})).status_code == 400
        assert (await client.post("/api/v1/files/upload", headers=headers, files={"file": ("bad.xlsx", b"not-xlsx", "application/octet-stream")})).status_code == 400
        assert (await client.post("/api/v1/files/upload", headers=headers, files={"file": ("bad.json", b"{invalid", "application/json")})).status_code == 400
        assert (await client.post("/api/v1/files/upload", headers=headers, files={"file": ("bad.csv", b"a,b\n1,\x002\n", "text/csv")})).status_code == 400
        assert (await client.post("/api/v1/files/upload", headers=headers, files={"file": ("app.exe", b"MZ...", "application/octet-stream")})).status_code == 415

        # Oversized upload check (patch MAX_UPLOAD_SIZE_MB to 1 MB)
        settings = get_settings()
        orig_mb = settings.MAX_UPLOAD_SIZE_MB
        settings.MAX_UPLOAD_SIZE_MB = 1
        try:
            big = await client.post(
                "/api/v1/files/upload",
                headers=headers,
                files={"file": ("big.txt", b"x" * (1024 * 1024 + 100), "text/plain")},
            )
            assert big.status_code == 413
        finally:
            settings.MAX_UPLOAD_SIZE_MB = orig_mb

        # Missing file on disk
        att_id = uuid.UUID(ts_res.json()["id"])
        async with AsyncSessionLocal() as session:
            att = (await session.execute(select(Attachment).where(Attachment.id == att_id))).scalar_one()
            Path(att.storage_path).unlink(missing_ok=True)
        missing_dl = await client.get(f"/api/v1/files/{att_id}/raw", headers=headers)
        assert missing_dl.status_code == 404


@pytest.mark.asyncio
async def test_mocked_streaming_edit_regenerate_and_error_handling():
    async def fake_stream_success(*, provider, model, messages, temperature=0.7):
        # Verify system prompt + history context reached provider
        assert any(m.role == "system" for m in messages)
        yield StreamChunk(delta="नमस्ते! ")
        yield StreamChunk(delta=f"Response from {provider}/{model}")
        yield StreamChunk(done=True, prompt_tokens=15, completion_tokens=10, total_tokens=25)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        _, headers, _ = await _signup_user(client, "stream@example.com", "Stream User")

        with patch("app.services.ai_conversation_service.stream_chat_completion", side_effect=fake_stream_success):
            s1 = await client.post(
                "/api/v1/chat/stream",
                headers=headers,
                json={"content": "Hello in Hindi", "provider": "openai", "model": "gpt-4o-mini"},
            )
            assert s1.status_code == 200
            assert "event: meta" in s1.text
            assert "नमस्ते!" in s1.text
            assert "event: done" in s1.text

        convs = (await client.get("/api/v1/conversations", headers=headers)).json()
        assert len(convs) == 1
        conv_id = convs[0]["id"]
        detail = (await client.get(f"/api/v1/conversations/{conv_id}", headers=headers)).json()
        assert len(detail["messages"]) == 2
        user_msg_id = detail["messages"][0]["id"]
        ai_msg_id = detail["messages"][1]["id"]

        # Regenerate replaces only assistant message, keeps user message intact
        with patch("app.services.ai_conversation_service.stream_chat_completion", side_effect=fake_stream_success):
            regen = await client.post(
                f"/api/v1/chat/conversations/{conv_id}/messages/{ai_msg_id}/regenerate",
                headers=headers,
                json={"provider": "gemini", "model": "gemini-2.5-flash"},
            )
            assert regen.status_code == 200
            assert "gemini/gemini-2.5-flash" in regen.text

        detail_after_regen = (await client.get(f"/api/v1/conversations/{conv_id}", headers=headers)).json()
        assert len(detail_after_regen["messages"]) == 2
        assert detail_after_regen["messages"][0]["id"] == user_msg_id

        # Edit and resend updates user message and replaces assistant message
        with patch("app.services.ai_conversation_service.stream_chat_completion", side_effect=fake_stream_success):
            edit = await client.post(
                f"/api/v1/chat/conversations/{conv_id}/messages/{user_msg_id}/edit-resend",
                headers=headers,
                json={"content": "Edited prompt", "provider": "anthropic", "model": "claude-3-5-sonnet-latest"},
            )
            assert edit.status_code == 200
            assert "anthropic/claude-3-5-sonnet-latest" in edit.text

        detail_after_edit = (await client.get(f"/api/v1/conversations/{conv_id}", headers=headers)).json()
        assert len(detail_after_edit["messages"]) == 2
        assert detail_after_edit["messages"][0]["content"] == "Edited prompt"


@pytest.mark.asyncio
async def test_gemini_uses_header_not_query_param_and_handles_timeouts_safely():
    captured_requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured_requests.append(request)
        if "timeout-model" in str(request.url):
            raise httpx.ReadTimeout("read timed out", request=request)
        sse_body = (
            'data: {"candidates":[{"content":{"parts":[{"text":"Gemini OK"}]}}],"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":2,"totalTokenCount":7}}\n\n'
        )
        return httpx.Response(200, content=sse_body.encode("utf-8"))

    settings = get_settings()
    orig_gemini_key = settings.GEMINI_API_KEY
    settings.GEMINI_API_KEY = "AIza-fake-secret-test-key-9999"

    try:
        from app.services.llm_provider_service import ChatMessagePayload, ProviderAPIError, stream_chat_completion

        transport = httpx.MockTransport(handler)
        orig_async_client = httpx.AsyncClient

        def mock_client(*args, **kwargs):
            kwargs["transport"] = transport
            return orig_async_client(*args, **kwargs)

        with patch("app.services.llm_provider_service.httpx.AsyncClient", side_effect=mock_client):
            chunks = []
            async for ch in stream_chat_completion(
                provider="gemini",
                model="gemini-2.5-flash",
                messages=[ChatMessagePayload(role="user", text="Hi")],
            ):
                chunks.append(ch)
            assert any(c.delta == "Gemini OK" for c in chunks)
            assert len(captured_requests) == 1
            req = captured_requests[0]
            assert "key=" not in str(req.url)
            assert req.headers.get("x-goog-api-key") == "AIza-fake-secret-test-key-9999"

            # Timeout must NOT leak API key in error message
            with pytest.raises(ProviderAPIError) as exc_info:
                async for _ in stream_chat_completion(
                    provider="gemini",
                    model="timeout-model",
                    messages=[ChatMessagePayload(role="user", text="Hi")],
                ):
                    pass
            assert "AIza-fake-secret-test-key-9999" not in str(exc_info.value)
            assert "timed out" in str(exc_info.value).lower()
    finally:
        settings.GEMINI_API_KEY = orig_gemini_key


@pytest.mark.asyncio
async def test_mocked_image_generation_and_rate_limits():
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), color=(240, 120, 40)).save(buf, format="PNG")
    fake_png_b64 = base64.b64encode(buf.getvalue()).decode("ascii")

    def openai_img_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"data": [{"b64_json": fake_png_b64, "revised_prompt": "Revised solar library"}]},
        )

    settings = get_settings()
    orig_openai_key = settings.OPENAI_API_KEY
    orig_rpm = settings.RATE_LIMIT_REQUESTS_PER_MINUTE
    settings.OPENAI_API_KEY = "sk-fake-test-key"

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            _, headers, _ = await _signup_user(client, "img@example.com", "Image User")

            transport = httpx.MockTransport(openai_img_handler)
            orig_async_client = httpx.AsyncClient

            def mock_client(*args, **kwargs):
                kwargs["transport"] = transport
                return orig_async_client(*args, **kwargs)

            with patch("app.services.image_generation_service.httpx.AsyncClient", side_effect=mock_client):
                res = await client.post(
                    "/api/v1/images/generate",
                    headers=headers,
                    json={"prompt": "Solar library", "provider": "openai"},
                )
            assert res.status_code == 200
            body = res.json()
            assert body["attachment_id"]
            assert body["image_base64"].startswith("data:image/png;base64,")

            # Verify stored attachment is downloadable
            dl = await client.get(f"/api/v1/files/{body['attachment_id']}/raw", headers=headers)
            assert dl.status_code == 200
            assert dl.headers["content-type"] == "image/png"

            # Verify RPM rate limit returns HTTP 429 BEFORE streaming starts
            settings.RATE_LIMIT_REQUESTS_PER_MINUTE = 1
            rate_limiter._buckets.clear()
            r1 = await client.post("/api/v1/chat/stream", headers=headers, json={"content": "First"})
            assert r1.status_code == 200
            r2 = await client.post("/api/v1/chat/stream", headers=headers, json={"content": "Second"})
            assert r2.status_code == 429
            assert "Retry-After" in r2.headers
    finally:
        settings.OPENAI_API_KEY = orig_openai_key
        settings.RATE_LIMIT_REQUESTS_PER_MINUTE = orig_rpm

