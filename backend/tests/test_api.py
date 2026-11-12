import io
import json
import os
import tempfile

import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_suraj_ai.db"
os.environ["UPLOAD_DIR"] = tempfile.mkdtemp(prefix="suraj_uploads_")
os.environ["OPENAI_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""
os.environ["ANTHROPIC_API_KEY"] = ""

from app.core.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services.file_processing_service import analyze_file_bytes  # noqa: E402


@pytest.fixture(autouse=True)
async def reset_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.mark.asyncio
async def test_health_and_capabilities():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

        cap = await client.get("/api/v1/settings/capabilities")
        assert cap.status_code == 200
        data = cap.json()
        assert data["database_connected"] is True
        assert len(data["llm_providers"]) == 3
        assert all(p["configured"] is False for p in data["llm_providers"])


@pytest.mark.asyncio
async def test_auth_conversations_files_and_honest_missing_api_key():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Signup
        signup = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "suraj@example.com",
                "full_name": "Suraj Developer",
                "password": "StrongPassword123!",
            },
        )
        assert signup.status_code == 201
        token = signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Me & Login
        me = await client.get("/api/v1/auth/me", headers=headers)
        assert me.status_code == 200
        assert me.json()["email"] == "suraj@example.com"

        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "suraj@example.com", "password": "StrongPassword123!"},
        )
        assert login.status_code == 200

        # 3. Preferences update
        pref = await client.patch(
            "/api/v1/settings/preferences",
            headers=headers,
            json={"preferred_language": "Hindi", "theme": "light"},
        )
        assert pref.status_code == 200
        assert pref.json()["preferred_language"] == "Hindi"
        assert pref.json()["theme"] == "light"

        # 4. Upload CSV file & verify real data profiling + chart data
        csv_bytes = b"month,revenue,users\nJan,1200,45\nFeb,1850,62\nMar,2400,88\n"
        upload_csv = await client.post(
            "/api/v1/files/upload",
            headers=headers,
            files={"file": ("metrics.csv", csv_bytes, "text/csv")},
        )
        assert upload_csv.status_code == 201
        csv_json = upload_csv.json()
        assert csv_json["kind"] == "data"
        assert csv_json["analysis_json"]["row_count"] == 3
        assert csv_json["analysis_json"]["chart"]["series"] == ["revenue", "users"]

        # 5. Upload PNG image
        buf = io.BytesIO()
        Image.new("RGB", (64, 48), color=(30, 120, 220)).save(buf, format="PNG")
        upload_img = await client.post(
            "/api/v1/files/upload",
            headers=headers,
            files={"file": ("sample.png", buf.getvalue(), "image/png")},
        )
        assert upload_img.status_code == 201
        assert upload_img.json()["analysis_json"]["width"] == 64

        # 6. Conversation CRUD (create, search, rename, pin, delete)
        conv = await client.post(
            "/api/v1/conversations",
            headers=headers,
            json={"title": "Quarterly Data Review"},
        )
        assert conv.status_code == 201
        conv_id = conv.json()["id"]

        renamed = await client.patch(
            f"/api/v1/conversations/{conv_id}",
            headers=headers,
            json={"title": "Renamed Quarterly Review", "is_pinned": True},
        )
        assert renamed.status_code == 200
        assert renamed.json()["title"] == "Renamed Quarterly Review"
        assert renamed.json()["is_pinned"] is True

        listed = await client.get("/api/v1/conversations?q=Renamed", headers=headers)
        assert listed.status_code == 200
        assert len(listed.json()) == 1

        # 7. Chat stream without API key returns explicit API_KEY_NOT_CONFIGURED error (no fake AI)
        stream_res = await client.post(
            "/api/v1/chat/stream",
            headers=headers,
            json={
                "conversation_id": conv_id,
                "content": "Analyze metrics.csv",
                "attachment_ids": [csv_json["id"]],
            },
        )
        assert stream_res.status_code == 200
        assert "API_KEY_NOT_CONFIGURED" in stream_res.text

        # 8. Verify conversation detail persisted user + error assistant message
        detail = await client.get(f"/api/v1/conversations/{conv_id}", headers=headers)
        assert detail.status_code == 200
        assert len(detail.json()["messages"]) == 2

        # 9. Image generation without API key returns 503 with explicit detail
        img_res = await client.post(
            "/api/v1/images/generate",
            headers=headers,
            json={"prompt": "A futuristic library in space"},
        )
        assert img_res.status_code == 503
        assert img_res.json()["detail"]["code"] == "API_KEY_NOT_CONFIGURED"

        # 10. Usage summary logged
        usage = await client.get("/api/v1/usage/summary", headers=headers)
        assert usage.status_code == 200
        assert usage.json()["total_requests"] >= 1

        # 11. Delete conversation
        deleted = await client.delete(f"/api/v1/conversations/{conv_id}", headers=headers)
        assert deleted.status_code == 204


def test_json_and_code_analysis():
    sample_json = json.dumps([{"quarter": "Q1", "sales": 100}, {"quarter": "Q2", "sales": 160}]).encode()
    kind, text, analysis = analyze_file_bytes("sales.json", "application/json", sample_json)
    assert kind == "data"
    assert analysis["row_count"] == 2
    assert analysis["chart"]["series"] == ["sales"]

    py_kind, py_text, py_meta = analyze_file_bytes("hello.py", "text/x-python", b"print('namaste')\n")
    assert py_kind == "document"
    assert py_meta["line_count"] == 2
    assert "namaste" in (py_text or "")
