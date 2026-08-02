# Embedding Compatibility Contract

Ticket: `JRE-EMB-001`

The recommendation engine requires query/context embeddings and durable job
document embeddings to share one vector space.

## Current Contract

| Field | Value |
|---|---|
| Job embedding table | `job_embeddings` |
| Vector column | `embedding vector(768)` |
| Required dimensions | `768` (`JOB_EMBEDDING_DIMENSIONS`) |
| Document purpose | `DOCUMENT` |
| Query purpose | `QUERY` |
| Provider/model source | `AI_EMBEDDING_PROVIDER`, `AI_EMBEDDING_MODEL` |

The same configured provider/model/dimension contract is used by:

- job embedding worker document indexing
- recommendation query embedding generation
- pgvector nearest-neighbor retrieval

## Guards

- Startup provider creation rejects `AI_EMBEDDING_DIMENSIONS` values that do not
  equal `JOB_EMBEDDING_DIMENSIONS`.
- Provider responses are rejected if returned vectors are not finite,
  non-zero, and exactly the configured dimension.
- Recommendation retrieval checks provider dimensions before vector search and
  fails closed with `EMBEDDING_DIMENSION_MISMATCH` on drift.

## Privacy

Raw vectors are not logged or returned by APIs. Logs may include provider, model,
dimensions, job id, event id, and aggregate outcomes.
