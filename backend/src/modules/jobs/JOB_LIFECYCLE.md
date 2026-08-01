# Job listing lifecycle (status vs physical delete)

## Statuses (`JobStatus`)

| Status | Meaning for public listing |
|---|---|
| `ACTIVE` | Visible in `GET /api/v1/jobs` and `GET /api/v1/jobs/:jobId` |
| `EXPIRED` | Not returned by public listing/detail (404 on detail) |
| `REMOVED` | Not returned by public listing/detail (404 on detail) |

Public discovery is **ACTIVE-only**. Inactive jobs are treated as not found for clients.

## Physical cleanup

Ingestion retention may **physically delete** stale rows (e.g. by `lastSeen` age) via cleanup jobs.
That is separate from flipping `status` to `EXPIRED`:

1. Prefer marking `EXPIRED` / `REMOVED` when a provider delists a role but we still need audit history briefly.
2. Physical delete removes the row (and cascaded sources/embeddings) once retention policy expires.

## Listing DTO

`JobListDto` does **not** expose `expiresAt`. There is no persisted expiry timestamp today; do not invent a null field that implies one. Clients should treat absence from the API as “not available,” not “expired on date X.”

## Re-ingest

Re-fetching a still-open role upserts the canonical job and keeps/returns it to `ACTIVE` according to persistence rules in `job.repository.ts`.
