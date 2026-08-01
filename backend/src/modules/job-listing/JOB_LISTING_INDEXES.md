# Job listing indexes (JOB-DB-001)

## Indexes added

| Index | Columns | Listing use |
|---|---|---|
| `jobs_status_created_at_idx` | `(status, created_at DESC)` | Default `sortBy=newest` on ACTIVE jobs |
| `jobs_status_salary_max_idx` | `(status, salary_max DESC)` | `sortBy=salaryHighToLow`; supports `minSalary` via `salary_max >=` |
| `jobs_status_salary_min_idx` | `(status, salary_min)` | `sortBy=salaryLowToHigh`; supports `maxSalary` via `salary_min <=` |
| `jobs_status_remote_type_idx` | `(status, remote_type)` | `remoteTypes` filter |
| `jobs_status_employment_type_idx` | `(status, employment_type)` | `employmentTypes` filter |

Existing indexes retained:

- `jobs_status_last_seen_idx` — ingestion cleanup / retention
- `jobs_company_slug_title_idx` — company slug + title lookups

## Staging EXPLAIN checklist

Run against a representative ACTIVE dataset after migrate:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM jobs
WHERE status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 20;

EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM jobs
WHERE status = 'ACTIVE' AND salary_max >= 50000
ORDER BY salary_max DESC
LIMIT 20;

EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM jobs
WHERE status = 'ACTIVE' AND remote_type = 'REMOTE'
ORDER BY created_at DESC
LIMIT 20;
```

Expect an Index Scan / Bitmap Index Scan on the matching `jobs_status_*` index (not a sequential scan of all rows).

## Rollback

```sql
DROP INDEX IF EXISTS "jobs_status_created_at_idx";
DROP INDEX IF EXISTS "jobs_status_salary_max_idx";
DROP INDEX IF EXISTS "jobs_status_salary_min_idx";
DROP INDEX IF EXISTS "jobs_status_remote_type_idx";
DROP INDEX IF EXISTS "jobs_status_employment_type_idx";
```

Or: `prisma migrate resolve` / revert migration in non-prod per team process.

## Production notes

1. Backup before migrate.
2. On large tables, consider creating the same indexes with `CREATE INDEX CONCURRENTLY` in a maintenance window, then marking the Prisma migration applied.
3. Monitor write latency on job upsert/cleanup; indexes add overhead on ingest.

## FTS follow-up (not in this ticket)

`query` currently uses `ILIKE`/`contains` on `title`, `description_text`, and company name. Next spike options:

1. `pg_trgm` GIN indexes on `title` / `description_text`
2. Postgres FTS (`tsvector` + GIN) maintained on ingest
3. Dedicated search service only if (1)/(2) fail latency targets

Do **not** introduce Elasticsearch until the spike shows Postgres search cannot meet SLOs.
