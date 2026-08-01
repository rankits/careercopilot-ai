# JR-LIFE-002 — Invalidate when recommended jobs close

List/get hydration excludes jobs that are no longer eligible:

- `Job.status !== ACTIVE` (expired/removed)
- No `job_embeddings` row matching current `jobs.version` (version mismatch)

Implemented in `PrismaRecommendationUnitOfWork` eligible filter (JR-RET-002). Closed jobs disappear from For You on next list without deleting historical recommendation rows.
