"""CORS must only admit configured browser origins."""

ALLOWED = "http://localhost:3000"


def test_allowed_origin_is_echoed(client):
    response = client.options(
        "/api/leads",
        headers={
            "Origin": ALLOWED,
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == ALLOWED


def test_unlisted_origin_is_not_authorised(client):
    response = client.options(
        "/api/leads",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.headers.get("access-control-allow-origin") in (None, "")
