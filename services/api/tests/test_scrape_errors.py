"""The API must distinguish a broken worker from a scrape that found nothing."""

import main


def _scrape(client, monkeypatch, behaviour):
    monkeypatch.setattr(main, "_run_scraper_subprocess", behaviour)
    return client.post(
        "/api/scrape",
        params={"query": "coffee shops", "region": "US", "source": "gmaps", "limit": "5"},
    )


def test_empty_result_is_not_an_error(anonymous_scrape, monkeypatch):
    client = anonymous_scrape(monkeypatch)

    response = _scrape(client, monkeypatch, lambda *args, **kwargs: [])

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "empty"
    assert payload["total_leads"] == 0
    assert "found no matching businesses" in payload["message"]


def test_worker_failure_returns_502(anonymous_scrape, monkeypatch):
    def fail(*args, **kwargs):
        raise main.ScraperError("browser crashed")

    client = anonymous_scrape(monkeypatch)
    response = _scrape(client, monkeypatch, fail)

    assert response.status_code == 502
    assert "browser crashed" in response.json()["detail"]


def test_worker_timeout_returns_504(anonymous_scrape, monkeypatch):
    def time_out(*args, **kwargs):
        raise main.ScraperTimeout("took too long")

    client = anonymous_scrape(monkeypatch)
    response = _scrape(client, monkeypatch, time_out)

    assert response.status_code == 504


def test_successful_scrape_reports_status_and_count(anonymous_scrape, monkeypatch):
    lead = {
        "Business Name": "Acme Coffee",
        "Phone": "555-0100",
        "Email": "hello@acme.example",
        "Website": "https://acme.example",
        "Has_Chatbot_Widget": False,
        "Mobile_Load_Ms": 2100,
        "Pitch_Hook": "Slow mobile site",
    }

    client = anonymous_scrape(monkeypatch)
    response = _scrape(client, monkeypatch, lambda *args, **kwargs: [lead])

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["total_leads"] == 1
    assert payload["leads"][0]["Business Name"] == "Acme Coffee"
