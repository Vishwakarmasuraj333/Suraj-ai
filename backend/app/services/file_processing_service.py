import base64
import csv
import io
import json
import mimetypes
import re
import uuid
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from openpyxl import load_workbook
from PIL import Image
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.models import Attachment, Conversation

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
TEXT_EXTENSIONS = {
    ".txt", ".md", ".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css",
    ".sql", ".yaml", ".yml", ".xml", ".log", ".sh", ".env", ".java", ".go", ".rs", ".cpp", ".c",
}
TABULAR_EXTENSIONS = {".csv", ".tsv", ".xlsx"}


def _safe_float(val: Any) -> float | None:
    if val is None or isinstance(val, bool):
        return None
    if isinstance(val, (int, float)):
        return float(val)
    text = str(val).strip().replace(",", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _profile_tabular_rows(headers: list[str], rows: list[list[Any]]) -> dict[str, Any]:
    total_rows = len(rows)
    columns_summary: list[dict[str, Any]] = []
    numeric_cols: list[str] = []

    for col_idx, header in enumerate(headers):
        col_values = [row[col_idx] if col_idx < len(row) else None for row in rows]
        non_empty = [v for v in col_values if v is not None and str(v).strip() != ""]
        numeric_vals = [n for v in non_empty if (n := _safe_float(v)) is not None]
        is_numeric = len(non_empty) > 0 and len(numeric_vals) >= max(1, int(len(non_empty) * 0.7))

        col_info: dict[str, Any] = {
            "name": header,
            "non_null": len(non_empty),
            "type": "numeric" if is_numeric else "categorical",
        }
        if is_numeric and numeric_vals:
            numeric_cols.append(header)
            col_info.update(
                {
                    "min": round(min(numeric_vals), 4),
                    "max": round(max(numeric_vals), 4),
                    "mean": round(sum(numeric_vals) / len(numeric_vals), 4),
                    "sum": round(sum(numeric_vals), 4),
                }
            )
        else:
            unique_vals = list(dict.fromkeys(str(v) for v in non_empty[:50]))
            col_info["sample_values"] = unique_vals[:5]
        columns_summary.append(col_info)

    # Build chart-ready preview (up to 25 rows, first categorical/label column + up to 4 numeric columns)
    chart_data: list[dict[str, Any]] = []
    if numeric_cols and rows:
        label_idx = 0
        for idx, header in enumerate(headers):
            if header not in numeric_cols:
                label_idx = idx
                break
        selected_numeric = [(headers.index(col), col) for col in numeric_cols[:4]]
        for r_idx, row in enumerate(rows[:25]):
            point: dict[str, Any] = {
                "label": str(row[label_idx]) if label_idx < len(row) and row[label_idx] is not None else f"Row {r_idx + 1}"
            }
            for c_idx, col_name in selected_numeric:
                val = _safe_float(row[c_idx]) if c_idx < len(row) else None
                point[col_name] = val if val is not None else 0
            chart_data.append(point)

    sample_rows = [
        {headers[i]: (row[i] if i < len(row) else None) for i in range(len(headers))}
        for row in rows[:10]
    ]

    return {
        "row_count": total_rows,
        "column_count": len(headers),
        "columns": columns_summary,
        "numeric_columns": numeric_cols,
        "sample_rows": sample_rows,
        "chart": {
            "title": "Dataset Preview",
            "xKey": "label",
            "series": numeric_cols[:4],
            "data": chart_data,
        }
        if chart_data
        else None,
    }


def analyze_file_bytes(filename: str, content_type: str, data: bytes) -> tuple[str, str | None, dict[str, Any]]:
    """Extract text, metadata, and structured analytics from uploaded bytes."""
    ext = Path(filename).suffix.lower()

    if ext in IMAGE_EXTENSIONS or content_type.startswith("image/"):
        try:
            with Image.open(io.BytesIO(data)) as img:
                width, height = img.size
                fmt = (img.format or ext.lstrip(".") or "PNG").upper()
                mode = img.mode
            return (
                "image",
                f"Image file '{filename}' ({fmt}, {width}x{height}px, mode={mode}).",
                {"width": width, "height": height, "format": fmt, "mode": mode},
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or corrupted image file: {exc}",
            ) from exc

    if ext == ".pdf" or content_type == "application/pdf":
        try:
            reader = PdfReader(io.BytesIO(data))
            pages_text: list[str] = []
            for idx, page in enumerate(reader.pages[:50]):
                txt = (page.extract_text() or "").strip()
                if txt:
                    pages_text.append(f"[Page {idx + 1}]\n{txt}")
            full_text = "\n\n".join(pages_text)
            if len(full_text) > 40000:
                full_text = full_text[:40000] + "\n...[truncated]"
            return (
                "pdf",
                full_text or "PDF parsed successfully, but no selectable text was found (may be scanned images).",
                {
                    "page_count": len(reader.pages),
                    "extracted_chars": len(full_text),
                    "has_text": bool(pages_text),
                },
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse PDF: {exc}",
            ) from exc

    if ext in {".csv", ".tsv"}:
        if b"\x00" in data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or binary CSV/TSV file.",
            )
        decoded = data.decode("utf-8", errors="replace")
        delimiter = "\t" if ext == ".tsv" else ","
        try:
            reader = csv.reader(io.StringIO(decoded), delimiter=delimiter)
            all_rows = list(reader)
        except csv.Error as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse CSV/TSV: {exc}",
            ) from exc
        if not all_rows:
            return ("data", "Empty CSV file.", {"row_count": 0, "column_count": 0})
        headers = [h.strip() or f"col_{i + 1}" for i, h in enumerate(all_rows[0])]
        rows = all_rows[1:]
        analysis = _profile_tabular_rows(headers, rows)
        summary_text = (
            f"Tabular dataset '{filename}': {analysis['row_count']} rows, {analysis['column_count']} columns.\n"
            f"Columns: {', '.join(headers)}\n"
            f"Summary stats: {json.dumps(analysis['columns'], ensure_ascii=False)}\n"
            f"Sample rows: {json.dumps(analysis['sample_rows'][:5], ensure_ascii=False)}"
        )
        return ("data", summary_text, analysis)

    if ext == ".xlsx":
        wb = None
        try:
            wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
            sheet = wb.active
            if sheet is None:
                return ("data", "Empty Excel workbook.", {"row_count": 0, "column_count": 0})
            all_rows = [list(r) for r in sheet.iter_rows(values_only=True)]
            if not all_rows:
                return ("data", "Empty Excel workbook.", {"row_count": 0, "column_count": 0})
            headers = [str(h).strip() if h is not None else f"col_{i + 1}" for i, h in enumerate(all_rows[0])]
            rows = all_rows[1:]
            analysis = _profile_tabular_rows(headers, rows)
            analysis["sheet_names"] = wb.sheetnames
            summary_text = (
                f"Excel dataset '{filename}' (sheet '{sheet.title}'): {analysis['row_count']} rows, "
                f"{analysis['column_count']} columns.\n"
                f"Summary stats: {json.dumps(analysis['columns'], ensure_ascii=False, default=str)}\n"
                f"Sample rows: {json.dumps(analysis['sample_rows'][:5], ensure_ascii=False, default=str)}"
            )
            return ("data", summary_text, analysis)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse Excel workbook: {exc}",
            ) from exc
        finally:
            if wb is not None:
                wb.close()

    if ext == ".json" or content_type == "application/json":
        decoded = data.decode("utf-8", errors="replace")
        try:
            parsed = json.loads(decoded)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid JSON file: {exc}") from exc

        analysis: dict[str, Any] = {"json_type": type(parsed).__name__}
        if isinstance(parsed, list) and parsed and isinstance(parsed[0], dict):
            headers = list(dict.fromkeys(k for item in parsed[:50] if isinstance(item, dict) for k in item.keys()))
            rows = [[item.get(h) if isinstance(item, dict) else None for h in headers] for item in parsed]
            analysis.update(_profile_tabular_rows(headers, rows))
        elif isinstance(parsed, dict):
            analysis["top_level_keys"] = list(parsed.keys())[:30]
        pretty = json.dumps(parsed, indent=2, ensure_ascii=False)
        if len(pretty) > 30000:
            pretty = pretty[:30000] + "\n...[truncated]"
        return ("data", pretty, analysis)

    if ext in TEXT_EXTENSIONS or content_type.startswith("text/"):
        text = data.decode("utf-8", errors="replace")
        line_count = text.count("\n") + 1
        if len(text) > 40000:
            text = text[:40000] + "\n...[truncated]"
        return ("document", text, {"line_count": line_count, "extension": ext or ".txt"})

    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail=f"Unsupported file type '{ext or content_type}'. Supported: PDF, PNG/JPG/WEBP/GIF, CSV/TSV/XLSX, JSON, TXT/MD/Code.",
    )


def sanitize_filename(raw_name: str | None) -> str:
    """Strip directory traversal segments and unsafe characters from uploaded filenames."""
    base = (raw_name or "upload.bin").replace("\\", "/").split("/")[-1]
    cleaned = re.sub(r"[\x00-\x1f\x7f]+", "", base).strip()
    if not cleaned or cleaned in {".", ".."}:
        return "upload.bin"
    return cleaned[:200]


async def _read_upload_with_limit(file: UploadFile, max_bytes: int) -> bytes:
    chunks: list[bytes] = []
    total = 0
    chunk_size = 64 * 1024
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds max size of {max_bytes // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


async def save_uploaded_file(
    db: AsyncSession,
    *,
    user_id: UUID,
    file: UploadFile,
    conversation_id: UUID | None = None,
) -> Attachment:
    settings = get_settings()
    if conversation_id is not None:
        conv_res = await db.execute(
            select(Conversation.id).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
        )
        if conv_res.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    raw_bytes = await _read_upload_with_limit(file, max_bytes)
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    filename = sanitize_filename(file.filename)
    content_type = file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    kind, extracted_text, analysis_json = analyze_file_bytes(filename, content_type, raw_bytes)

    upload_root = Path(settings.UPLOAD_DIR).resolve()
    user_dir = (upload_root / str(user_id)).resolve()
    if not user_dir.is_relative_to(upload_root):
        raise HTTPException(status_code=400, detail="Invalid upload directory.")
    user_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4()}_{filename}"
    storage_path = (user_dir / stored_name).resolve()
    if not storage_path.is_relative_to(user_dir):
        raise HTTPException(status_code=400, detail="Invalid filename.")
    storage_path.write_bytes(raw_bytes)

    attachment = Attachment(
        user_id=user_id,
        conversation_id=conversation_id,
        filename=filename,
        content_type=content_type,
        file_size=len(raw_bytes),
        storage_path=str(storage_path),
        kind=kind,
        extracted_text=extracted_text,
        analysis_json=analysis_json,
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return attachment


async def get_attachment_for_user(db: AsyncSession, user_id: UUID, attachment_id: UUID) -> Attachment:
    result = await db.execute(
        select(Attachment).where(Attachment.id == attachment_id, Attachment.user_id == user_id)
    )
    att = result.scalar_one_or_none()
    if att is None:
        raise HTTPException(status_code=404, detail="Attachment not found.")
    return att


def attachment_to_image_data_uri(attachment: Attachment) -> tuple[str, str] | None:
    if attachment.kind != "image":
        return None
    path = Path(attachment.storage_path)
    if not path.exists():
        return None
    raw = path.read_bytes()
    b64 = base64.b64encode(raw).decode("ascii")
    mime = attachment.content_type if attachment.content_type.startswith("image/") else "image/png"
    return mime, b64

