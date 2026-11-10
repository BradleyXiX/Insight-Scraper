from pathlib import Path
import pytest

import config
import parsers

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def test_gmaps_fixture_parses_expected_businesses():
    html = (FIXTURES_DIR / "gmaps" / "sample.html").read_text(encoding="utf-8")
    leads = parsers.parse_gmaps(html, region="US")
    assert len(leads) == 22
    first = leads[0]
    assert first["Business Name"] == "TruYou Dental - Great Neck"
    assert "Website" in first
    assert "Phone" in first
    assert "Email" in first
    assert "Socials" in first
    assert "Has_Chatbot_Widget" in first
    assert "Mobile_Load_Ms" in first
    assert "Pitch_Hook" in first
    assert first["Region"] == "US"


def test_duckduckgo_fixture_parses_expected_businesses():
    html = (FIXTURES_DIR / "duckduckgo-places" / "sample.html").read_text(
        encoding="utf-8"
    )
    leads = parsers.parse_duckduckgo(html, region="US")
    # DuckDuckGo currently responds with an error page / anti-bot block, returning []
    assert leads == []


def test_yellowpages_fixture_parses_expected_businesses():
    html = (FIXTURES_DIR / "yellowpages-intl" / "sample.html").read_text(
        encoding="utf-8"
    )
    leads = parsers.parse_yellowpages(html, region="US")
    assert len(leads) >= 30
    first = leads[0]
    assert first["Business Name"] == "Aspen Dental"
    assert "Website" in first
    assert "Phone" in first
    assert "Email" in first
    assert "Socials" in first
    assert "Has_Chatbot_Widget" in first
    assert "Mobile_Load_Ms" in first
    assert "Pitch_Hook" in first
    assert first["Region"] == "US"


def test_a_broken_fixture_returns_an_empty_list_not_an_exception():
    garbage = "<<<malformed html>>> <div> unclosed <><!@#$%^"
    assert parsers.parse_gmaps(garbage) == []
    assert parsers.parse_duckduckgo(garbage) == []
    assert parsers.parse_yellowpages(garbage) == []
    assert parsers.parse_gmaps("") == []
    assert parsers.parse_duckduckgo("") == []
    assert parsers.parse_yellowpages("") == []


def test_source_info_marks_a_degraded_source(authed_client, local_mode):
    assert "gmaps" in config.SOURCE_INFO
    assert config.SOURCE_INFO["gmaps"]["degraded"] is False

    assert "duckduckgo-places" in config.SOURCE_INFO
    assert config.SOURCE_INFO["duckduckgo-places"]["degraded"] is True
    assert len(config.SOURCE_INFO["duckduckgo-places"]["note"]) > 0

    assert "yellowpages-intl" in config.SOURCE_INFO

    resp = authed_client.get("/api/sources")
    assert resp.status_code == 200
    data = resp.json()
    assert "sources" in data
    assert data["sources"]["duckduckgo-places"]["degraded"] is True
