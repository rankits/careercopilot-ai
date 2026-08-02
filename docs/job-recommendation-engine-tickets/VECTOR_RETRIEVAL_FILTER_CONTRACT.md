# Vector Retrieval Filter Contract

Ticket: `JRE-VEC-001`

## Scope

pgvector recommendation retrieval must constrain nearest-neighbor search by job eligibility and supported metadata filters before hydration/scoring.

## SQL Contract

`JobEmbeddingRepository.searchNearest()` pushes down:

- provider
- model
- current job version: `job_embeddings.job_version = jobs.version`
- active job status: `jobs.status = ACTIVE`
- company slugs
- remote types
- exclude job IDs
- posted-after date
- minimum salary compatibility
- maximum salary compatibility
- currency

The recommendation retrieval provider still post-filters hydrated jobs with `passesCandidateJobFilters()` to preserve business-rule correctness after vector retrieval.

## Index Contract

Migrations maintain:

- `job_embeddings_embedding_hnsw_idx`
- `USING hnsw ("embedding" vector_cosine_ops)`
- `job_embeddings_dimensions_check` with 768 dimensions
- supporting provider/model/job-version and content-hash indexes

If the planner cannot use ANN for a query shape, pgvector still has an exact-search fallback. That may be slower but keeps correctness.

## Observability

Retrieval metadata includes:

- `retrievalCandidateCount`
- `retrievalLatencyMs`
- embedding cache hit flags

## Current Limitations

This ticket documents and tests existing pushdown coverage. Additional metadata expansion and canonical duplicate collapse remain follow-up vector tickets.
