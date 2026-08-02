# Recommendation Eligibility Filter Contract

Ticket: `JRE-FILTER-001`

Default personalized recommendation surfaces show only currently eligible jobs.

## Eligible Job Rule

A recommendation is eligible for default list/get hydration only when:

- the linked job exists
- `jobs.status = ACTIVE`
- a `job_embeddings` row exists for the linked job
- the embedding row `job_version` equals the current `jobs.version`

Jobs marked `EXPIRED` or `REMOVED`, jobs without current embeddings, and deleted
jobs are omitted from default active recommendation lists. This can reduce item
counts for users with older recommendation runs, which is intentional.

## Retrieval Path

Vector search may return stale ids, but recommendation retrieval hydrates ids
through the active-only job repository before post-filters and scoring. Unhydrated
ids are dropped.

## List Path

The Prisma recommendation repository selects eligible recommendation ids before
pagination and total counting. Hydration repeats the eligibility check before
returning DTOs.
