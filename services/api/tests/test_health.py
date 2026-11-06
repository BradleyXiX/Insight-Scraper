"""Liveness and readiness must be separate signals."""

import main


def test_liveness_does_not_require_the_database(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_fails_when_the_database_is_unavailable(client, monkeypatch):
    class BrokenEngine:
        def connect(self):
            raise RuntimeError("connection refused")

    monkeypatch.setattr(main, "engine", BrokenEngine())

    response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json()["detail"] == "Database unavailable"
