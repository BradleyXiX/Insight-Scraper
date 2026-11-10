import pytest
from parsers import pitch_rank_for


@pytest.mark.parametrize(
    "website,load_ms,chatbot,expected_rank",
    [
        ("https://a.com", 4200, True, 1),  # slow
        ("http://a.com", 1200, True, 2),  # no TLS
        ("https://a.com", 1200, False, 3),  # no chat
        ("", 0, False, 4),  # no website
        ("https://a.com", 800, True, 5),  # healthy
    ],
)
def test_rank_precedence(website, load_ms, chatbot, expected_rank):
    rank, _ = pitch_rank_for(website, load_ms, chatbot)
    assert rank == expected_rank


def test_pitch_text_names_the_measured_fact():
    rank, pitch = pitch_rank_for("https://a.com", 4200, True)
    assert rank == 1
    assert "4.2s" in pitch


def test_no_website_is_not_rank_one():
    rank, _ = pitch_rank_for("", 4500, False)
    assert rank == 4
    assert rank != 1

    rank_none, _ = pitch_rank_for(None, 4500, False)
    assert rank_none == 4
    assert rank_none != 1
