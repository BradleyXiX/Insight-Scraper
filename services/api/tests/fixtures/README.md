# Parser Test Fixtures

All fixtures in this directory are minimal, self-authored, MIT-safe synthetic HTML files written solely to exercise the CSS selectors in `services/api/src/parsers.py`.

## Synthetic Data Conventions

- Business names are fictional.
- Domains use RFC 2606 reserved `.example` hostnames.
- Phone numbers use fictitious NANP `555-01xx` numbers.

## Policy

Never commit raw scraped third-party HTML dumps, `<script>` bundles, real business PII, geolocation coordinates, or client IP addresses into `tests/fixtures/`. The automated guard in `services/api/tests/test_parsers.py` enforces size limits, script exclusion, and IPv4 address checks across all fixture HTML files.
