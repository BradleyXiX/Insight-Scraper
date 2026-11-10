import pytest
from pitch import build_email


@pytest.fixture
def sample_settings():
    return {
        "sender_name": "Jane Operator",
        "sender_email": "jane@example.com",
        "sender_phone": "+1 555-0100",
    }


@pytest.fixture
def sample_leads():
    return {
        1: {
            "business_name": "Acme Spa",
            "website": "https://acmespa.com",
            "mobile_load_ms": 4200,
            "has_chatbot_widget": False,
            "pitch_rank": 1,
        },
        2: {
            "business_name": "Apex Clinic",
            "website": "http://apexclinic.com",
            "mobile_load_ms": 1200,
            "has_chatbot_widget": True,
            "pitch_rank": 2,
        },
        3: {
            "business_name": "Beacon Dental",
            "website": "https://beacondental.com",
            "mobile_load_ms": 1400,
            "has_chatbot_widget": False,
            "pitch_rank": 3,
        },
        4: {
            "business_name": "Cedar Law",
            "website": "",
            "mobile_load_ms": 0,
            "has_chatbot_widget": False,
            "pitch_rank": 4,
        },
        5: {
            "business_name": "Delta Auto",
            "website": "https://deltaauto.com",
            "mobile_load_ms": 900,
            "has_chatbot_widget": True,
            "pitch_rank": 5,
        },
    }


def test_each_rank_produces_its_own_subject(sample_leads, sample_settings):
    subjects = {
        build_email(sample_leads[rank], sample_settings)["subject"]
        for rank in (1, 2, 3, 4, 5)
    }
    assert len(subjects) == 5


def test_body_has_no_unresolved_braces(sample_leads, sample_settings):
    for rank in (1, 2, 3, 4, 5):
        # With full settings
        res = build_email(sample_leads[rank], sample_settings)
        assert "{" not in res["subject"] and "}" not in res["subject"]
        assert "{" not in res["body"] and "}" not in res["body"]

        # With empty settings
        res_empty = build_email(sample_leads[rank], {})
        assert "{" not in res_empty["subject"] and "}" not in res_empty["subject"]
        assert "{" not in res_empty["body"] and "}" not in res_empty["body"]


def test_body_is_under_120_words(sample_leads, sample_settings):
    for rank in (1, 2, 3, 4, 5):
        res = build_email(sample_leads[rank], sample_settings)
        word_count = len(res["body"].split())
        assert word_count < 120


def test_missing_signature_does_not_print_a_placeholder(sample_leads):
    lead = sample_leads[1]
    for empty_settings in ({}, None, {"sender_name": None, "sender_email": None, "sender_phone": None}):
        res = build_email(lead, empty_settings)
        body = res["body"]
        assert "None" not in body
        assert "{" not in body
        assert "your_name" not in body.lower()
        assert "your name" not in body.lower()

    # Partial settings
    res_name_only = build_email(lead, {"sender_name": "Alice"})
    assert "Alice" in res_name_only["body"]
    assert "None" not in res_name_only["body"]


def test_body_contains_the_measured_fact(sample_leads, sample_settings):
    # Rank 1 names the measured seconds
    res1 = build_email(sample_leads[1], sample_settings)
    assert "4.2s" in res1["body"]

    # Rank 2 names HTTP / HTTPS
    res2 = build_email(sample_leads[2], sample_settings)
    assert "http" in res2["body"].lower()

    # Rank 3 names after-hours or chatbot
    res3 = build_email(sample_leads[3], sample_settings)
    assert "chat" in res3["body"].lower() or "hours" in res3["body"].lower()

    # Rank 4 names directory or no website
    res4 = build_email(sample_leads[4], sample_settings)
    assert "directory" in res4["body"].lower() or "website" in res4["body"].lower()


def test_body_ends_with_an_opt_out(sample_leads, sample_settings):
    expected_opt_out = "If this is not relevant, tell me and I will not follow up."
    for rank in (1, 2, 3, 4, 5):
        for settings in (sample_settings, {}, None):
            res = build_email(sample_leads[rank], settings)
            lines = [line.strip() for line in res["body"].strip().splitlines() if line.strip()]
            assert lines[-1] == expected_opt_out


def test_null_pitch_rank_falls_back_to_rank_five(sample_settings):
    lead = {
        "business_name": "Old Lead",
        "website": "https://oldlead.com",
        "mobile_load_ms": 1000,
        "pitch_rank": None,
    }
    res = build_email(lead, sample_settings)
    res_rank5 = build_email({**lead, "pitch_rank": 5}, sample_settings)
    assert res["subject"] == res_rank5["subject"]
    assert res["body"] == res_rank5["body"]


def test_rank_one_without_a_measurement_invents_nothing(sample_settings):
    lead = {
        "business_name": "Ghost Site",
        "website": "https://ghost.example",
        "mobile_load_ms": 0,
        "pitch_rank": 1,
    }
    res = build_email(lead, sample_settings)
    combined = res["subject"] + res["body"]
    assert "3.1s" not in combined
    assert "took" not in combined.lower()
    # Falls back to the honest rank-5 template rather than citing a fake number.
    rank5 = build_email({**lead, "pitch_rank": 5}, sample_settings)
    assert res["body"] == rank5["body"]


def test_placeholder_business_name_does_not_reach_the_greeting(sample_settings):
    lead = {
        "business_name": "N/A",
        "website": "https://noname.example",
        "mobile_load_ms": 1200,
        "pitch_rank": 3,
    }
    res = build_email(lead, sample_settings)
    assert "Hi N/A" not in res["body"]
    assert res["body"].startswith("Hi,")


def test_settings_api_round_trips_sender_fields(authed_client, local_mode):
    # Update settings with sender information
    payload = {
        "default_region": "GB",
        "default_source": "yellowpages-intl",
        "default_limit": 20,
        "sender_name": "Marcus Vance",
        "sender_email": "marcus@foundry.co",
        "sender_phone": "+44 20 7946 0991",
    }
    put_resp = authed_client.put("/api/settings", json=payload)
    assert put_resp.status_code == 200
    data = put_resp.json()
    assert data["sender_name"] == "Marcus Vance"
    assert data["sender_email"] == "marcus@foundry.co"
    assert data["sender_phone"] == "+44 20 7946 0991"

    # Get settings verifies persistence
    get_resp = authed_client.get("/api/settings")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["sender_name"] == "Marcus Vance"
    assert get_data["sender_email"] == "marcus@foundry.co"
    assert get_data["sender_phone"] == "+44 20 7946 0991"


def test_get_leads_attaches_email_fields(authed_client, local_mode):
    # Configure sender settings
    authed_client.put(
        "/api/settings",
        json={
            "default_region": "US",
            "default_source": "gmaps",
            "default_limit": 25,
            "sender_name": "Sarah Connor",
            "sender_email": "sarah@cyberdyne.io",
            "sender_phone": "+1 555-4321",
        },
    )

    from db import tenant_session
    from models import Lead

    tenant_id = "test_tenant"
    with tenant_session(tenant_id) as db:
        lead = Lead(
            tenant_id=tenant_id,
            business_name="Fast Tech",
            website="https://fasttech.io",
            mobile_load_ms=4500,
            pitch_rank=1,
            pitch_hook="Speed overhaul",
        )
        db.add(lead)
        db.flush()

    resp = authed_client.get("/api/leads")
    assert resp.status_code == 200
    leads = resp.json()
    assert len(leads) >= 1
    found = next((l for l in leads if l["business_name"] == "Fast Tech"), None)
    assert found is not None
    assert "email_subject" in found
    assert "email_body" in found
    assert "Mobile load time" in found["email_subject"]
    assert "4.5s" in found["email_body"]
    assert "Sarah Connor" in found["email_body"]
    assert "sarah@cyberdyne.io" in found["email_body"]
    assert found["email_body"].strip().endswith(
        "If this is not relevant, tell me and I will not follow up."
    )

