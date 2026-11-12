import contextvars
import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any

request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


class RequestContextFilter(logging.Filter):
    """Attach the active request_id to every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get("-")
        return True


class JsonLogFormatter(logging.Formatter):
    """Emit structured single-line JSON logs safe for log aggregation."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "request_id": getattr(record, "request_id", "-"),
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
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

    root = logging.getLogger("suraj_ai")
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)
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
