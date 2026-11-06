"""Configuration defaults must be safe without any environment set."""

import config


def test_dev_bypass_defaults_to_false(monkeypatch):
    monkeypatch.delenv("DEV_BYPASS_AUTH", raising=False)
    assert config.dev_bypass_enabled() is False


def test_production_has_no_default_cors_origins(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)

    assert config.allowed_origins() == []


def test_allowed_origins_are_parsed_and_normalised(monkeypatch):
    monkeypatch.setenv(
        "ALLOWED_ORIGINS",
        "https://app.example.com/, https://staging.example.com",
    )

    assert config.allowed_origins() == [
        "https://app.example.com",
        "https://staging.example.com",
    ]


def test_development_defaults_to_local_dashboard(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)

    assert config.allowed_origins() == [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


def test_billing_requires_both_secrets(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_example")
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    assert config.billing_configured() is False

    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_example")
    assert config.billing_configured() is True


def test_placeholder_clerk_values_are_rejected(monkeypatch):
    monkeypatch.setenv("CLERK_FRONTEND_API", "https://your-clerk-api.clerk.accounts.dev")
    assert config.clerk_frontend_api() is None

    monkeypatch.setenv("CLERK_FRONTEND_API", "https://real.clerk.accounts.dev/")
    assert config.clerk_frontend_api() == "https://real.clerk.accounts.dev"
