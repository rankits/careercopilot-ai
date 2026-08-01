# Recommendation list pagination order (JR-API-003)

`GET /api/v1/job-recommendations` returns the caller's persisted recommendations with **stable, documented ordering**:

1. `createdAt` **DESC** — newest recommendations first (typically from the latest run)
2. `rank` **ASC** — within the same timestamp, lower rank (better match) first
3. `id` **ASC** — UUID tie-break for deterministic pagination

Within-run persistence ranks by `overallScore DESC`, then `job.id ASC` before assign sequential `rank`.

Clients should not infer order from array index alone across pages; use `rank` and paginate with `page` / `limit`.
