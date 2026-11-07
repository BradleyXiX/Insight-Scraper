"""Input validation must reject bad requests before any work starts."""

import pytest

VALID = {
    "query": "coffee shops",
    "region": "US",
    "source": "gmaps",
    "limit": "25",
}


@pytest.mark.parametrize(
    "params",
    [
        {**VALID, "query": "a"},
        {**VALID, "query": "x" * 201},
        {**VALID, "query": ""},
        {**VALID, "region": "XX"},
        {**VALID, "region": "us"},
        {**VALID, "source": "bing"},
        {**VALID, "limit": "0"},
        {**VALID, "limit": "51"},
        {**VALID, "limit": "10000"},
        {**VALID, "limit": "-1"},
    ],
)
def test_invalid_scrape_parameters_return_422(authed_client, params):
    response = authed_client.post("/api/scrape", params=params)
    assert response.status_code == 422


def test_every_supported_region_is_accepted(authed_client, monkeypatch):
    # A valid request proceeds past validation and stops at the unconfigured billing
    # gate, which is asserted as 503 rather than 422.
    import config

    monkeypatch.setattr(config, "billing_configured", lambda: False)

    for region in ("US", "GB", "AU", "CA", "AE", "KE"):
        response = authed_client.post(
            "/api/scrape", params={**VALID, "region": region}
        )
        assert response.status_code == 503


def test_removed_client_supplied_checkout_endpoint_is_gone(authed_client):
    response = authed_client.post("/api/checkout", json={"price_id": "price_123"})
    assert response.status_code in (404, 405)
