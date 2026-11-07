"""Authentication must fail closed. These tests describe the exact failure modes."""

import time

import jwt
import pytest
from fastapi import HTTPException

import auth
import config


def _missing_token():
    return None


def test_missing_clerk_config_returns_503(monkeypatch):
    monkeypatch.delenv("DEV_BYPASS_AUTH", raising=False)
    monkeypatch.setenv("CLERK_FRONTEND_API", "")

    with pytest.raises(HTTPException) as exc:
        auth.verify_clerk_token(_missing_token())

    assert exc.value.status_code == 503
    assert "not configured" in exc.value.detail.lower()


def test_no_token_returns_401_when_clerk_configured(monkeypatch):
    monkeypatch.delenv("DEV_BYPASS_AUTH", raising=False)
    monkeypatch.setenv("CLERK_FRONTEND_API", "https://example.clerk.accounts.dev")

    with pytest.raises(HTTPException) as exc:
        auth.verify_clerk_token(_missing_token())

    assert exc.value.status_code == 401


def test_unreachable_jwks_returns_503(monkeypatch):
    monkeypatch.delenv("DEV_BYPASS_AUTH", raising=False)
    monkeypatch.setenv("CLERK_FRONTEND_API", "https://example.clerk.accounts.dev")
    monkeypatch.setattr(auth, "get_jwks", lambda: None)

    token = jwt.encode(
        {"sub": "user_1", "exp": int(time.time()) + 60},
        "test-signing-key-that-is-long-enough",
        algorithm="HS256",
    )

    class Credentials:
        credentials = token

    with pytest.raises(HTTPException) as exc:
        auth.verify_clerk_token(Credentials())

    assert exc.value.status_code == 503


def test_token_without_key_id_is_rejected(monkeypatch):
    monkeypatch.delenv("DEV_BYPASS_AUTH", raising=False)
    monkeypatch.setenv("CLERK_FRONTEND_API", "https://example.clerk.accounts.dev")
    monkeypatch.setattr(auth, "get_jwks", lambda: {"keys": []})

    token = jwt.encode(
        {"sub": "user_1", "exp": int(time.time()) + 60},
        "test-signing-key-that-is-long-enough",
        algorithm="HS256",
    )

    class Credentials:
        credentials = token

    with pytest.raises(HTTPException) as exc:
        auth.verify_clerk_token(Credentials())

    assert exc.value.status_code == 401
    assert "key id" in exc.value.detail.lower()


def test_dev_bypass_returns_configured_tenant(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("DEV_BYPASS_AUTH", "true")
    monkeypatch.setenv("DEV_TENANT_ID", "local_operator")

    assert auth.verify_clerk_token(_missing_token()) == "local_operator"


def test_dev_bypass_is_disabled_in_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DEV_BYPASS_AUTH", "true")
    monkeypatch.setenv("CLERK_FRONTEND_API", "")

    assert config.dev_bypass_enabled() is False

    with pytest.raises(RuntimeError):
        config.validate_startup()

    with pytest.raises(HTTPException) as exc:
        auth.verify_clerk_token(_missing_token())

    assert exc.value.status_code == 503
