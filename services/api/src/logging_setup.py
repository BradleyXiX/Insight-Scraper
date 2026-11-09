import contextvars
from datetime import datetime, timezone
import json
import logging
import os
import sys
from typing import Any, TextIO

_REQUEST_ID_CTX: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "request_id", default=None
)

_INSTALLED_HANDLERS: list[logging.Handler] = []


def set_request_id(value: str) -> contextvars.Token[str | None]:
    return _REQUEST_ID_CTX.set(value)


def reset_request_id(token: contextvars.Token[str | None]) -> None:
    _REQUEST_ID_CTX.reset(token)


def get_request_id() -> str | None:
    return _REQUEST_ID_CTX.get()


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        # ISO-8601 UTC with millisecond precision
        now = datetime.fromtimestamp(record.created, tz=timezone.utc)
        ts = now.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

        payload: dict[str, Any] = {
            "ts": ts,
            "level": record.levelname,
            "event": getattr(record, "event", record.getMessage()),
        }

        request_id = getattr(record, "request_id", None)
        if request_id is not None:
            payload["request_id"] = request_id

        extra_fields = getattr(record, "extra_fields", None)
        if isinstance(extra_fields, dict):
            for k, v in extra_fields.items():
                if k not in payload:
                    payload[k] = v

        return json.dumps(payload, default=str)


class TextFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        now = datetime.fromtimestamp(record.created, tz=timezone.utc)
        ts = now.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

        event = getattr(record, "event", record.getMessage())
        parts = [f"{ts} [{record.levelname}] {event}"]

        request_id = getattr(record, "request_id", None)
        if request_id is not None:
            parts.append(f"request_id={request_id}")

        extra_fields = getattr(record, "extra_fields", None)
        if isinstance(extra_fields, dict):
            for k, v in extra_fields.items():
                parts.append(f"{k}={v}")

        return " ".join(parts)


def configure_logging(
    level: str | None = None,
    fmt: str | None = None,
    stream: TextIO | None = None,
) -> None:
    effective_level_str = (
        level or os.getenv("LOG_LEVEL", "INFO")
    ).upper()
    effective_level = getattr(logging, effective_level_str, logging.INFO)

    effective_fmt = (fmt or os.getenv("LOG_FORMAT", "json")).lower()

    target_stream = stream or sys.stdout

    root_logger = logging.getLogger()
    root_logger.setLevel(effective_level)

    global _INSTALLED_HANDLERS
    for h in _INSTALLED_HANDLERS:
        root_logger.removeHandler(h)
    _INSTALLED_HANDLERS.clear()

    handler = logging.StreamHandler(target_stream)
    handler.setLevel(effective_level)

    if effective_fmt == "text":
        handler.setFormatter(TextFormatter())
    else:
        handler.setFormatter(JsonFormatter())

    root_logger.addHandler(handler)
    _INSTALLED_HANDLERS.append(handler)


def log_event(event: str, level: int = logging.INFO, **fields: Any) -> None:
    logger = logging.getLogger("insight")
    if not logger.isEnabledFor(level):
        return

    req_id = get_request_id()
    extra: dict[str, Any] = {
        "event": event,
        "extra_fields": fields,
    }
    if req_id is not None:
        extra["request_id"] = req_id

    logger.log(level, event, extra=extra)
