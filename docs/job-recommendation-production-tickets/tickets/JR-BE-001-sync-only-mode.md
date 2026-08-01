# JR-BE-001 — Sync-only recommendation generation

## Decision (JR-PROD-002)

Job recommendations are generated **synchronously** in the HTTP request path (`POST /api/v1/job-recommendations`). There is no background recommendation worker or queue.

## Removed stubs

- `backend/src/workers/recommendation.worker.ts`
- `backend/src/workers/job-sync.worker.ts`
- `backend/src/queues/recommendation.queue.ts`

These were empty placeholders and were not registered in `server.ts` or `package.json` worker scripts.

## Operational notes

- Generation is rate-limited per user (see JR-SEC-001).
- Job **embedding** indexing remains async via RabbitMQ + `worker:job-embeddings`.
- Do not re-introduce a recommendation queue unless product moves to async generation with explicit UX for pending runs.
