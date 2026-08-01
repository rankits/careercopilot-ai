# pgvector retrieval filter contract (JR-VEC-001)

Frozen contract for `JobEmbeddingRepository.searchNearest` as used by
`PgVectorCandidateRetrievalProvider`.

## Base SQL guards (always applied)

| Filter | Column / join | Value |
|---|---|---|
| Provider + model match | `job_embeddings.provider`, `job_embeddings.model` | From active embedding provider |
| Version alignment | `job_embeddings.job_version = jobs.version` | Stale vectors excluded |
| Active jobs only | `jobs.status` | `ACTIVE` |

## Optional request filters (`SearchJobEmbeddingsInput.filters`)

| Field | SQL behavior | Set by recommendation retrieval |
|---|---|---|
| `excludeJobIds` | `jobs.id NOT IN (...)` | Similar-jobs / JOB seed exclusion |
| `remoteTypes` | `jobs.remote_type IN (...)` | `context.remotePreference` |
| `minSalary` | `COALESCE(salary_max, salary_min) >= min` | `context.salaryExpectation.minimum` |
| `maxSalary` | `COALESCE(salary_min, salary_max) <= max` | `context.salaryExpectation.maximum` |
| `currency` | `UPPER(jobs.currency) = code` | `context.salaryExpectation.currency` |
| `companySlugs` | `jobs.company_slug IN (...)` | Not set today |
| `postedAfter` | `jobs.posted_at >= date` | Not set today |

## Post-vector hydration filters

Applied in `passesCandidateJobFilters` after KNN:

- Employment type, location strings, excluded companies, salary ceiling from context
- Over-fetch (`limit × 4`, cap 200) compensates for post-filter shrinkage

## Out of scope (future tickets)

- Job expiry / `REMOVED` beyond ACTIVE status guard
- Work authorization / visa eligibility metadata
- User-specific exclusion from feedback (JR-RET-001)

## Similarity score

Cosine distance via pgvector `<=>`; mapped to `retrievalScore = 1 - distance` in `[0, 1]`.
