# Candidate Embedding Contract

Ticket: `JRE-EMB-002`

## Scope

Candidate recommendation query embeddings are persisted per user/source/provider/model and reused when the normalized recommendation content is unchanged.

## Data Model

`CandidateEmbedding` stores:

- `userId`
- `sourceType`
- `sourceId`
- `sourceKey`
- `provider`
- `model`
- `dimensions`
- `contentHash`
- `embedding`
- timestamps

The natural key is `(userId, sourceType, sourceKey, provider, model)`. `sourceKey` is `sourceId` when present, otherwise the source type, so `PROFILE` rows have a stable non-null key.

## Reuse Policy

The pgvector candidate retrieval provider builds the recommendation query text, hashes it with SHA-256, and asks `CandidateEmbeddingService` for a fresh vector.

- If provider/model/source/contentHash/dimensions match, the stored vector is reused.
- If content changes, the service generates a new `QUERY` embedding and upserts the row.
- If no candidate embedding service is configured, retrieval falls back to the existing Redis query embedding cache.

## Invalidation

`invalidateUserRecommendationState(userId)` clears:

- Redis query embeddings for the user
- persisted candidate embeddings for the user

Profile/resume-specific invalidation can be narrowed in follow-up lifecycle tickets.

## Security

Raw vectors are never returned by recommendation APIs. Repository methods remain user/source scoped.

## Observability

The resolver maintains in-process hit/miss counters via `candidateEmbeddingMetricsSnapshot()`. Retrieval metadata includes `candidateEmbeddingCacheHit`.

## Current Limitations

The implementation is synchronous. Async embedding jobs, stale failure UX, and cross-source context reuse remain follow-up tickets.
