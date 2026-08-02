# Retrieval Dedup Contract

Ticket: `JRE-VEC-002`

## Scope

Recommendation retrieval collapses duplicate candidate jobs after hydration/filtering and before scoring.

## Key Policy

Until `canonicalHash` is available on the retrieval DTO, the dedup key uses public listing fields:

- company slug/name
- normalized title
- remote type or formatted location
- employment type
- salary currency/min/max
- sorted skills

This keeps the policy deterministic without exposing internal raw vectors or database-only hashes.

## Winner Policy

For each duplicate key:

1. keep the job with the highest vector retrieval score
2. if scores tie, keep the lexicographically smallest job ID

Winners are returned in retrieval-score order with job ID as the stable tie-break.

## Observability

Retrieval metadata includes `retrievalDedupRemoved`.

## Current Limitations

This is a retrieval-time collapse. It does not repair upstream ingestion duplicates and may be refined when canonical job identity is added to internal retrieval DTOs.
