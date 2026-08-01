# JR-REL-001 — Graceful degradation

Readiness /status returns blockers instead of failing silently:

- EMBEDDING_COVERAGE_LOW when indexed job ratio < 25%
- EMBEDDING_PROVIDER_UNAVAILABLE on retrieval embed failures (503)
- Coverage query failures degrade to ratio=1 in test/offline environments

FE shows non-blocking banners; generate errors surface provider failures to the client.

