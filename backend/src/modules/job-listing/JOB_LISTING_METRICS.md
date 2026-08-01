# Job listing metrics (JOB-QA-005)

## Signals

Emitted on every `GET /api/v1/jobs` completion via `recordJobListingRequest`:

| Field | Meaning |
|---|---|
| `name` | Always `job_listing_request` |
| `outcome` | `success` \| `empty` \| `error` |
| `statusCode` | HTTP status associated with the outcome |
| `durationMs` | Handler latency (rounded ms) |
| `hasFilters` | Whether any non-default filter was set |
| `resultCount` | `pagination.totalItems` on success/empty |

Structured log line: `job_listing_metric` (pino child `scope=jobs`).

## Privacy

Never log raw `query` text or other free-text filter values in the metric payload.

## In-process counters

`getJobListingMetricsSnapshot()` exposes request/empty/5xx/latency samples for unit tests and local diagnostics. Production aggregation should scrape logs or wire a future Prometheus exporter to the same `recordJobListingRequest` hook.
