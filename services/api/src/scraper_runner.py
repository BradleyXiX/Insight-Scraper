"""Run the Playwright worker as a cancellable asyncio subprocess."""

import asyncio
import json
import sys
from pathlib import Path
from typing import Callable

WORKER_PATH = Path(__file__).with_name("scraper_worker.py")


class ScraperError(RuntimeError):
    """The worker ran but did not produce usable output."""


class ScraperTimeout(ScraperError):
    """The worker exceeded its time limit."""


_MISSING_BROWSER_HINT = (
    "The scraper browser is not installed on the API host. "
    "Run `playwright install chromium`, then retry."
)

# Characters Playwright uses to draw its "run playwright install" banner.
_BANNER_CHARS = set(" \t╔╗╚╝║═╠╣╦╩╬─│┌┐└┘├┤┬┴┼=_-+|")


def _is_banner_line(line: str) -> bool:
    stripped = line.strip()
    return not stripped or all(char in _BANNER_CHARS for char in stripped)


def _shorten(message: str, limit: int = 300) -> str:
    if len(message) <= limit:
        return message
    return message[: limit - 1].rstrip() + "…"


def summarize_stderr(stderr: str) -> str:
    """Turn worker stderr into one actionable line for the operator.

    A traceback ends with the exception line, but Playwright appends a decorative
    "run playwright install" banner after it. Taking the last raw line therefore
    reported a row of box-drawing characters instead of the real failure.
    """
    text = (stderr or "").strip()
    if not text:
        return "the worker exited with an error"

    lowered = text.lower()
    if "executable doesn't exist" in lowered or "playwright install" in lowered:
        return _MISSING_BROWSER_HINT

    lines = [line.strip() for line in text.splitlines() if not _is_banner_line(line)]
    if not lines:
        return "the worker exited with an error"

    for line in reversed(lines):
        if "error" in line.lower() or "exception" in line.lower():
            return _shorten(line)

    return _shorten(lines[-1])


def parse_leads(output: str) -> list:
    """Extract the lead array from worker stdout.

    The worker is expected to print a JSON array, but a preceding log line is
    tolerated by slicing from the first `[` to the last `]`.
    """
    clean = output.strip()
    if not clean:
        raise ScraperError("the worker returned no output")

    if clean.startswith("[") and clean.endswith("]"):
        payload = clean
    else:
        start = clean.find("[")
        end = clean.rfind("]")
        if start == -1 or end <= start:
            raise ScraperError("the worker returned output that was not a lead list")
        payload = clean[start : end + 1]

    try:
        leads = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise ScraperError("the worker returned malformed lead data") from exc

    if not isinstance(leads, list):
        raise ScraperError("the worker returned an unexpected data shape")

    return leads


async def run_worker_async(
    query: str,
    region: str,
    source: str,
    limit: int,
    timeout_seconds: int,
    on_process: Callable[[asyncio.subprocess.Process], None] | None = None,
) -> list:
    """Execute the worker and return its leads.

    `on_process` receives the live process so the caller can terminate it when a
    cancellation is requested.
    """
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-u",
        str(WORKER_PATH),
        "--query",
        query,
        "--region",
        region,
        "--source",
        source,
        "--limit",
        str(limit),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    if on_process is not None:
        on_process(process)

    try:
        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=timeout_seconds
        )
    except asyncio.TimeoutError as exc:
        process.kill()
        await process.wait()
        raise ScraperTimeout(
            f"The scrape exceeded the {timeout_seconds}s time limit."
        ) from exc
    except asyncio.CancelledError:
        if process.returncode is None:
            process.kill()
            await process.wait()
        raise

    if process.returncode != 0:
        raise ScraperError(
            summarize_stderr((stderr or b"").decode("utf-8", errors="replace"))
        )

    return parse_leads((stdout or b"").decode("utf-8", errors="replace"))
