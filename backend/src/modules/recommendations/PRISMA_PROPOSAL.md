# Job recommendations Prisma proposal

**Status: approved for persistence slice.** Retention, PGVECTOR retrieval, dimensions 768, and
deletion behavior (job children Cascade; user ownership via `userId` publicId without User FK)
are approved.

## Landed entities

1. `RecommendationRun` — user-owned generation lifecycle
2. `JobRecommendation` — user/run-owned scored job link (`@@unique([runId, jobId])`)
3. `RecommendationScoreComponent` — per-component scores (`@@unique([recommendationId, component])`)
4. `RecommendationFeedback` — user feedback upsert (`@@unique([userId, recommendationId])`)

Schema: `backend/prisma/recommendations.prisma`  
Migration: `backend/prisma/migrations/20260801003000_add_job_recommendations`

## Deferred entities

5. `SavedRecommendationSearch` — until SAVED_SEARCH domain exists
6. `CareerTarget` — until CAREER_GOAL domain exists
7. `JobEmbedding` — already owned by `job-embeddings.prisma`
8. `CandidateEmbedding` — separate privacy/embedding domain

## Conventions

- UUID IDs, `createdAt`/`updatedAt`, enums aligned with `recommendations.types.ts`
- Every read/update query includes `userId` in its predicate
- UoW wraps run lifecycle + recommendation/component/feedback writes; retrieval/scoring stay outside
- Job FKs Cascade; no User FK (same soft-ownership pattern as Application/Resume)
- Do not persist source text, resume contents, provider secrets, or vectors in recommendation rows
