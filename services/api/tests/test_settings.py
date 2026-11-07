"""Workspace defaults: read, persist, validate, and keep tenant-scoped."""

import main

DEFAULTS = {
    "default_region": "US",
    "default_source": "gmaps",
    "default_limit": 25,
}


def test_defaults_are_returned_without_stored_settings(authed_client):
    response = authed_client.get("/api/settings")

    assert response.status_code == 200
    assert response.json() == DEFAULTS


def test_update_persists_and_is_returned(authed_client):
    update = {
        "default_region": "GB",
        "default_source": "duckduckgo-places",
        "default_limit": 40,
    }

    put_response = authed_client.put("/api/settings", json=update)
    get_response = authed_client.get("/api/settings")

    assert put_response.status_code == 200
    assert put_response.json() == update
    assert get_response.json() == update


def test_update_replaces_previous_values(authed_client):
    authed_client.put(
        "/api/settings",
        json={
            "default_region": "GB",
            "default_source": "duckduckgo-places",
            "default_limit": 40,
        },
    )

    response = authed_client.put(
        "/api/settings",
        json={
            "default_region": "AU",
            "default_source": "yellowpages-intl",
            "default_limit": 10,
        },
    )

    assert response.json() == {
        "default_region": "AU",
        "default_source": "yellowpages-intl",
        "default_limit": 10,
    }


def test_invalid_settings_are_rejected(authed_client):
    for payload in (
        {"default_region": "XX", "default_source": "gmaps", "default_limit": 25},
        {"default_region": "US", "default_source": "bing", "default_limit": 25},
        {"default_region": "US", "default_source": "gmaps", "default_limit": 0},
        {"default_region": "US", "default_source": "gmaps", "default_limit": 51},
        {"default_region": "US", "default_source": "gmaps"},
    ):
        response = authed_client.put("/api/settings", json=payload)
        assert response.status_code == 422, payload


def test_settings_do_not_leak_between_tenants(authed_client):
    authed_client.put(
        "/api/settings",
        json={
            "default_region": "KE",
            "default_source": "gmaps",
            "default_limit": 5,
        },
    )

    main.app.dependency_overrides[main.verify_clerk_token] = lambda: "other_tenant"
    response = authed_client.get("/api/settings")

    assert response.json() == DEFAULTS
