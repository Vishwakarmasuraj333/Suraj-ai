import contextvars
import json
import logging
import re
import sys
from collections import deque
from datetime import datetime, timezone
from threading import Lock
from typing import Any

request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

_REDACT_PATTERNS = [
    re.compile(r"(sk-[A-Za-z0-9_-]{8,})"),
    re.compile(r"(AIza[A-Za-z0-9_-]{8,})"),
    re.compile(r"(Bearer\s+[A-Za-z0-9._-]+)", re.IGNORECASE),
]


def redact_sensitive_text(text: str) -> str:
    cleaned = text
    for pattern in _REDACT_PATTERNS:
        cleaned = pattern.sub("[REDACTED]", cleaned)
    return cleaned


class RequestContextFilter(logging.Filter):
    """Attach the active request_id to every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get("-")
        return True


class RecentLogBufferHandler(logging.Handler):
    """Store a bounded ring buffer of redacted structured log records for admin diagnostics."""

    def __init__(self, maxlen: int = 120) -> None:
        super().__init__()
        self._lock = Lock()
        self._entries: deque[dict[str, Any]] = deque(maxlen=maxlen)

    def emit(self, record: logging.LogRecord) -> None:
        try:
            entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "request_id": getattr(record, "request_id", "-"),
                "message": redact_sensitive_text(record.getMessage()),
            }
            with self._lock:
                self._entries.append(entry)
        except Exception:
            pass

    def recent(self, limit: int = 50) -> list[dict[str, Any]]:
        with self._lock:
            items = list(self._entries)
        return items[-max(1, min(limit, 120)) :][::-1]


recent_log_buffer = RecentLogBufferHandler()


class JsonLogFormatter(logging.Formatter):
    """Emit structured single-line JSON logs safe for log aggregation."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "request_id": getattr(record, "request_id", "-"),
            "message": redact_sensitive_text(record.getMessage()),
        }
        if record.exc_info:
            payload["exception"] = redact_sensitive_text(self.formatException(record.exc_info))
        return json.dumps(payload, ensure_ascii=False)


def configure_logging(debug: bool = False, json_logs: bool = False) -> logging.Logger:
    level = logging.DEBUG if debug else logging.INFO
    if json_logs:
        formatter: logging.Formatter = JsonLogFormatter()
    else:
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)s | req=%(request_id)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.addFilter(RequestContextFilter())

    recent_log_buffer.addFilter(RequestContextFilter())

    root = logging.getLogger("suraj_ai")
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)
    root.addHandler(recent_log_buffer)
    root.propagate = False
    return root


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"suraj_ai.{name}")


def mask_secret(value: str | None) -> str:
    if not value:
        return "not-configured"
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}...{value[-4:]}"


def safe_log_dict(payload: dict[str, Any]) -> dict[str, Any]:
    redacted = {}
    for k, v in payload.items():
        if any(
            secret_key in k.lower()
            for secret_key in ("key", "token", "password", "secret", "authorization", "cookie")
        ):
            redacted[k] = "***"
        else:
            redacted[k] = v
    return redacted
