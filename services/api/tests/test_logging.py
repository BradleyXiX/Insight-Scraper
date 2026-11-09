import io
import json
import logging

import pytest

import logging_setup


def test_json_formatter_emits_required_keys():
    stream = io.StringIO()
    logging_setup.configure_logging(fmt="json", stream=stream)
    logging_setup.log_event("job.started", job_id="job_123", tenant_id="tenant_abc")

    output = stream.getvalue().strip()
    assert output, "Expected log line emitted"
    data = json.loads(output)
    assert "ts" in data
    assert data["ts"].endswith("Z")
    assert data["level"] == "INFO"
    assert data["event"] == "job.started"
    assert data["job_id"] == "job_123"
    assert data["tenant_id"] == "tenant_abc"
    # When no request_id is set, key should be omitted rather than null
    assert "request_id" not in data


def test_request_id_appears_in_every_record():
    stream = io.StringIO()
    logging_setup.configure_logging(fmt="json", stream=stream)
    token = logging_setup.set_request_id("req_xyz")
    try:
        logging_setup.log_event("request.finished", method="GET", path="/api/health", status_code=200)
    finally:
        logging_setup.reset_request_id(token)

    output = stream.getvalue().strip()
    data = json.loads(output)
    assert data["request_id"] == "req_xyz"
    assert data["event"] == "request.finished"
    assert data["method"] == "GET"
    assert data["status_code"] == 200


def test_text_format_is_human_readable():
    stream = io.StringIO()
    logging_setup.configure_logging(fmt="text", stream=stream)
    logging_setup.log_event("job.finished", job_id="job_456", duration_ms=120)

    output = stream.getvalue().strip()
    assert "job.finished" in output
    assert "job_id=job_456" in output
    assert "duration_ms=120" in output
    assert "{" not in output
    assert "}" not in output


def test_level_is_configurable(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "WARNING")
    stream = io.StringIO()
    logging_setup.configure_logging(fmt="json", stream=stream)

    logging_setup.log_event("job.queued", level=logging.INFO, job_id="job_789")
    assert stream.getvalue() == ""

    logging_setup.log_event("job.failed", level=logging.WARNING, job_id="job_789", reason="failed")
    output = stream.getvalue().strip()
    assert output != ""
    data = json.loads(output)
    assert data["event"] == "job.failed"
    assert data["level"] == "WARNING"
