# Job recommendations Prisma proposal

This is a schema proposal only. No model or migration should be added until retention, retrieval
backend, embedding dimensions, and deletion behavior are approved.

## Proposed entities

1. `RecommendationRun`: user-owned generation lifecycle with source type, nullable source ID,
   status, candidate count, failure code, configuration version, and timestamps. The normalized
   recommendation context remains transient and is not persisted.
2. `JobRecommendation`: user- and run-owned link to an existing job with aggregate score, category,
   match type, rank, timestamps, and uniqueness on `(runId, jobId)`.
3. `RecommendationScoreComponent`: child of a recommendation containing the exact component,
   weight, score, and safe explanation metadata; unique on `(recommendationId, component)`.
4. `RecommendationFeedback`: user-owned feedback for a recommendation/job containing action,
   optional note, and timestamps.
5. `SavedRecommendationSearch`: user-owned reusable filters/preferences with an explicit schema
   version and timestamps.
6. `CareerTarget`: user-owned target roles, skills, location, compensation, lifecycle status, and
   timestamps.
7. `JobEmbedding`: job-owned vector metadata with provider/model/version, dimensions, content
   checksum, and refresh timestamp. Its vector field depends on the approved retrieval backend.
8. `CandidateEmbedding`: user-owned embedding metadata for a profile, resume, or career target,
   including source ID, provider/model/version, dimensions, checksum, and refresh timestamp.

## Repository and schema conventions

- Use UUID IDs, `createdAt`/`updatedAt`, explicit relation names, indexes for each foreign key and
  user-scoped access path, and enums matching the module's exported values.
- Every recommendation read/update query must include `userId` in its predicate. Ownership checks
  after an unscoped read are insufficient.
- Run creation/lifecycle changes and recommendation/component writes use the unit-of-work boundary.
  Candidate retrieval and scoring should not hold a database transaction open.
- Define deliberate cascade/restrict behavior against existing User and Job conventions before a
  migration. Feedback may cascade with recommendations; embedding retention needs a privacy review.
- Do not store source text, resume contents, provider secrets, or vectors in JSON metadata. Select
  PGVector, Elasticsearch/OpenSearch, or external-vector storage before defining vector fields and
  indexes.
