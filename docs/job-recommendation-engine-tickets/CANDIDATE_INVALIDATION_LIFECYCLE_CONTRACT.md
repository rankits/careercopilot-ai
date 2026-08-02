# Candidate Invalidation Lifecycle Contract

Ticket: `JRE-LIFE-001`

## Scope

Candidate profile and resume material changes must invalidate recommendation query embeddings and persisted candidate embeddings, and must surface stale recommendation readiness until the user refreshes/generates a new run.

## Hooks

- Candidate profile PATCH invalidates all recommendation state for the user after the profile update succeeds.
- Resume profile confirm invalidates all recommendation state for the user after the candidate profile is upserted.
- Resume parse and reparse queueing invalidates query embeddings and the candidate embedding row for that `RESUME` source.
- Failed ownership checks or validation failures do not invalidate state.

## Stale Readiness

`profileUpdatedAfter(userId, timestamp)` returns true when any of these user-owned source timestamps are newer than the completed recommendation timestamp:

- `CandidateProfile.updatedAt`
- the profile's `sourceResumeId` `Resume.updatedAt`
- latest `ResumeParseRun.updatedAt` for the source resume
- latest `ResumeExtraction.createdAt` for the source resume

When stale, readiness includes `RECOMMENDATIONS_STALE` and lifecycle state `STALE`.

## Observability

`recommendationInvalidationTotal` backs the `recommendation_invalidation_total` expectation and increments after query and candidate embedding invalidation both complete.

