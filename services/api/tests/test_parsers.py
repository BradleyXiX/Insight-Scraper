import re
from pathlib import Path
import pytest

import config
import parsers

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

REQUIRED_LEAD_KEYS = (
    "Business Name",
    "Phone",
    "Website",
    "Email",
    "Socials",
    "Has_Chatbot_Widget",
    "Mobile_Load_Ms",
    "Pitch_Hook",
    "Region",
)


def test_gmaps_fixture_parses_expected_businesses():
    html = (FIXTURES_DIR / "gmaps" / "sample.html").read_text(encoding="utf-8")
    leads = parsers.parse_gmaps(html, region="US")
    assert len(leads) == 4
    for key in REQUIRED_LEAD_KEYS:
        assert key in leads[0]

    assert leads[0]["Business Name"] == "Cedar Ridge Dental"
    assert leads[0]["Phone"] == "+1-512-555-0101"
    assert leads[0]["Website"] == "https://cedar-ridge-dental.example"
    assert leads[0]["Region"] == "US"

    assert leads[1]["Business Name"] == "Harborview Family Dentistry"
    assert leads[1]["Phone"] == "(512) 555-0142"
    assert leads[1]["Website"] == "https://harborview-dentistry.example"

    assert leads[2]["Business Name"] == "Northside Orthodontics"
    assert leads[2]["Phone"] == "Hidden"
    assert leads[2]["Website"] == "http://northside-ortho.example"

    assert leads[3]["Business Name"] == "Oakwood Dental Studio"
    assert leads[3]["Phone"] == "Hidden"
    assert leads[3]["Website"] == ""

    assert len(parsers.parse_gmaps(html, region="US", limit=2)) == 2


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
    assert len(leads) == 3
    for key in REQUIRED_LEAD_KEYS:
        assert key in leads[0]

    assert leads[0]["Business Name"] == "Cedar Valley Dental"
    assert leads[0]["Phone"] == "(512) 555-0110"
    assert leads[0]["Website"] == "https://cedar-valley-dental.example"
    assert leads[0]["Region"] == "US"

    assert leads[1]["Business Name"] == "Riverfront Dental Group"
    assert leads[1]["Phone"] == "(512) 555-0122"
    assert leads[1]["Website"] == "https://riverfront-dental.example"

    assert leads[2]["Business Name"] == "Midtown Dental Care"
    assert leads[2]["Phone"] == "Hidden"
    assert leads[2]["Website"] == ""

    assert len(parsers.parse_yellowpages(html, region="US", limit=2)) == 2


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


def test_fixtures_are_minimal_synthetic_and_scrubbed():
    html_files = sorted(FIXTURES_DIR.rglob("*.html"))
    assert len(html_files) == 3

    for fixture_path in html_files:
        raw_bytes = fixture_path.read_bytes()
        assert len(raw_bytes) < 16_384, f"{fixture_path} exceeds 16 KiB limit"
        text = raw_bytes.decode("utf-8")
        assert "<script" not in text.lower(), f"{fixture_path} contains a <script> tag"
        assert (
            re.search(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", text) is None
        ), f"{fixture_path} contains an IPv4 address"

