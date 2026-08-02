# Recommendation Performance Budgets

Ticket: `JRE-PERF-001`

## Staging Budgets

These are the production-readiness budgets for the synchronous MVP generate path:

- Warm PROFILE generate p95: 2,500 ms after candidate embedding and job embedding coverage are warm.
- Warm RESUME/TARGET_TEXT/CAREER_GOAL/SAVED_SEARCH generate p95: 3,500 ms.
- Retrieval stage p95: 900 ms for `limit=20`.
- Scoring + deterministic ranking p95: 800 ms for `limit=20`.
- Persistence stage p95: 400 ms for `limit=20`.
- Timeout ceiling remains 55 seconds; timeout returns a failed run and no fake jobs.

## Measurement Contract

`recommendationMetricsSnapshot().stageAverageLatencyMs` reports average timings for:

- `context`
- `feedback`
- `retrieval`
- `scoring`
- `ranking`
- `persistence`

The generate log event includes the same `stageDurationsMs` object for operational dashboards.

`recommendationMetricsSnapshot().stageLatencyHistogram` records counts for each stage in these
buckets:

- `le_100`
- `le_250`
- `le_500`
- `le_1000`
- `le_2500`
- `le_5000`
- `gt_5000`

## Retrieval Budget

PGVECTOR retrieval uses a named over-fetch policy:

- `RECOMMENDATION_RETRIEVAL_OVERFETCH_MULTIPLIER`, default `4`
- `RECOMMENDATION_RETRIEVAL_MAX_SEARCH_LIMIT`, default `200`

This keeps hydrated post-filtering able to fill the requested page while bounding vector search work.

## Cache Verification

Candidate embedding reuse is measured by `candidateEmbeddingCacheHit`, `candidateEmbeddingCacheMiss`, and `contextEmbeddingReuseTotal`. Warm-path load tests should verify high cache-hit rates before measuring p95 generate latency.
