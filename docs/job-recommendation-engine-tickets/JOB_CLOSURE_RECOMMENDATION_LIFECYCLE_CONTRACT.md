# Job Closure Recommendation Lifecycle Contract

Ticket: `JRE-LIFE-002`

## Scope

Historical recommendation rows must not surface jobs that are no longer eligible for users to view or apply to.

## Listing Behavior

- Recommendation list and run-detail pages include only jobs that remain active and have a current embedding.
- Recommendation detail lookups return not found when the underlying job is no longer eligible.
- In-memory recommendation repositories apply the same active/expiry/deletion semantics used by production list filtering.

## Production Eligibility

The Prisma recommendation repository filters list IDs through the existing active-job predicate:

- `jobs.status = ACTIVE`
- a current `job_embeddings` row exists for the job's current version

The repository counts hidden historical rows and records `jobRecommendationHiddenTotal`, backing the `job_recommendation_hidden_total` expectation.

## Embedding Cleanup

The job embedding indexer treats inactive job semantic-content events as delete/tombstone events. It calls `deleteForJob(jobId)` and completes the event without generating a new embedding. Repeated delete events are idempotent because delete counts are not required to be positive.

