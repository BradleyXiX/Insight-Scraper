"""Worker output parsing must fail loudly and report something actionable."""

import pytest

from scraper_runner import (
    ScraperError,
    parse_leads,
    summarize_stderr,
)

PLAYWRIGHT_BANNER = """\
playwright._impl._errors.Error: BrowserType.launch: Executable doesn't exist at /ms-playwright/chromium-1148/chrome
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551 Looks like Playwright was just installed or updated.       \u2551
\u2551 Please run the following command to download new browsers: \u2551
\u2551     playwright install                                     \u2551
\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d
"""


def test_parse_leads_accepts_a_plain_array():
    assert parse_leads('[{"business_name": "Acme"}]') == [{"business_name": "Acme"}]


def test_parse_leads_tolerates_a_leading_log_line():
    assert parse_leads('log line\n[{"business_name": "Acme"}]\n') == [
        {"business_name": "Acme"}
    ]


@pytest.mark.parametrize("output", ["", "   ", "no json here", '{"a": 1}', "[1,"])
def test_parse_leads_rejects_unusable_output(output):
    with pytest.raises(ScraperError):
        parse_leads(output)


def test_missing_browser_banner_becomes_an_actionable_message():
    message = summarize_stderr(PLAYWRIGHT_BANNER)
    assert "playwright install chromium" in message
    assert "\u2550" not in message


def test_decorative_lines_are_not_reported_as_the_reason():
    stderr = "\n".join(
        [
            "Traceback (most recent call last):",
            '  File "worker.py", line 1, in <module>',
            "RuntimeError: the directory returned no results",
            "\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d",
        ]
    )
    assert summarize_stderr(stderr) == "RuntimeError: the directory returned no results"


def test_empty_stderr_falls_back_to_a_generic_reason():
    assert summarize_stderr("") == "the worker exited with an error"


def test_long_reasons_are_truncated():
    message = summarize_stderr("Error: " + "x" * 500)
    assert len(message) <= 300
    assert message.endswith("…")
