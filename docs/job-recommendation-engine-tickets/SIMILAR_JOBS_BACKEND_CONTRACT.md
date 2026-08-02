# Similar Jobs Backend Contract

Ticket: `JRE-VEC-003`

## Scope

`GET /api/v1/job-recommendations/similar/:jobId` returns scored similar jobs for an active catalog job and never returns the source job.

## Service Policy

`SimilarJobsService.findSimilar()`:

1. authorizes the source `JOB`
2. builds a `JOB` recommendation context
3. retrieves pgvector candidates with `excludeJobIds: [jobId]`
4. defensively removes the source job again before scoring
5. returns stable sorted scored results

If retrieval returns only the source job, the service returns an empty list and does not score.

## Eligibility

The retrieval path remains responsible for active/current-version filtering and hydration through the active-only job repository.

## Observability

`similarJobsMetricsSnapshot()` exposes `similarJobsEmptyTotal` for empty defensive results.

## API

The route is unchanged:

`GET /api/v1/job-recommendations/similar/:jobId?limit=<1..100>`

Authentication and `recommendations.read.own` are required. Unknown/ineligible source jobs remain `404`.
