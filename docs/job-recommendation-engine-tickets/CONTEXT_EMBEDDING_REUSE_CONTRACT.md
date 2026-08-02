# Context Embedding Reuse Contract

Ticket: `JRE-EMB-003`

## Scope

Candidate embedding reuse is keyed by user, provider, model, and normalized context content hash, with source-specific rows maintained for lifecycle invalidation.

## Lookup Order

`CandidateEmbeddingService.resolve()` uses this order:

1. find a fresh row for the exact user/source/provider/model/contentHash
2. find a reusable row for the same user/provider/model/contentHash across any source
3. generate a new `QUERY` embedding and upsert the current source row

When step 2 succeeds, the service upserts the current source row with the reused vector so future source-specific invalidation still has a row to target.

## Sources

The same resolver supports:

- `PROFILE`
- `RESUME`
- `TARGET_TEXT`
- `CAREER_GOAL`
- `SAVED_SEARCH`
- `JOB`

Current source availability still depends on the recommendation source strategies and authorization layer.

## Security

Reuse never crosses users. The reusable lookup includes `userId`, `provider`, `model`, `contentHash`, and `dimensions`.

## Observability

`candidateEmbeddingMetricsSnapshot()` includes `contextEmbeddingReuseTotal`.

## Current Limitations

The content hash is based on the generated recommendation query text. A future context-fingerprint ticket may make this independent from retrieval query formatting.
