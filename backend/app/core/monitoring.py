from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from typing import Any


@dataclass
class ProviderStats:
    requests: int = 0
    errors: int = 0
    total_tokens: int = 0
    images: int = 0


class AppMetrics:
    """Thread-safe in-process operational metrics store (contains no PII or prompt text)."""

    def __init__(self) -> None:
        self._lock = Lock()
        self.started_at = datetime.now(timezone.utc)
        self.total_requests: int = 0
        self.client_errors_4xx: int = 0
        self.server_errors_5xx: int = 0
        self.latency_count: int = 0
        self.latency_total_ms: int = 0
        self.latency_max_ms: int = 0
        self.redis_errors: int = 0
        self.provider_usage: dict[str, ProviderStats] = defaultdict(ProviderStats)
        self.recent_errors: deque[dict[str, Any]] = deque(maxlen=25)

    def record_http_request(
        self,
        *,
        method: str,
        path: str,
        status_code: int,
        latency_ms: int,
        request_id: str,
        error_type: str | None = None,
    ) -> None:
        with self._lock:
            self.total_requests += 1
            self.latency_count += 1
            self.latency_total_ms += max(0, latency_ms)
            if latency_ms > self.latency_max_ms:
                self.latency_max_ms = latency_ms
            if 400 <= status_code < 500:
                self.client_errors_4xx += 1
            elif status_code >= 500:
                self.server_errors_5xx += 1

            if status_code >= 500 or error_type:
                self.recent_errors.append(
                    {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "request_id": request_id,
                        "method": method,
                        "path": path,
                        "status_code": status_code,
                        "error_type": error_type or f"http_{status_code}",
                    }
                )

    def record_redis_error(self) -> None:
        with self._lock:
            self.redis_errors += 1

    def record_ai_usage(
        self,
        *,
        provider: str,
        total_tokens: int = 0,
        image_count: int = 0,
        status_value: str = "success",
    ) -> None:
        with self._lock:
            stats = self.provider_usage[provider or "unknown"]
            stats.requests += 1
            stats.total_tokens += max(0, total_tokens)
            stats.images += max(0, image_count)
            if status_value != "success":
                stats.errors += 1

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            avg_latency = (
                round(self.latency_total_ms / self.latency_count, 2)
                if self.latency_count > 0
                else 0.0
            )
            uptime_seconds = int((datetime.now(timezone.utc) - self.started_at).total_seconds())
            return {
                "uptime_seconds": max(0, uptime_seconds),
                "total_requests": self.total_requests,
                "client_errors_4xx": self.client_errors_4xx,
                "server_errors_5xx": self.server_errors_5xx,
                "avg_latency_ms": avg_latency,
                "max_latency_ms": self.latency_max_ms,
                "redis_errors": self.redis_errors,
                "providers": {
                    name: {
                        "requests": stats.requests,
                        "errors": stats.errors,
                        "total_tokens": stats.total_tokens,
                        "images": stats.images,
                    }
                    for name, stats in self.provider_usage.items()
                },
            }


metrics = AppMetrics()

