-- JOB-DB-001: indexes for public job listing filters and sorts.
-- Expand: add supporting indexes. Contract/rollback: drop the same indexes.

-- CREATE INDEX CONCURRENTLY is intentionally not used so this stays
-- transaction-safe for `prisma migrate`. For large prod tables, prefer a
-- follow-up expand window that creates these concurrently then drops the
-- transactional copies if needed.

CREATE INDEX "jobs_status_created_at_idx" ON "jobs"("status", "created_at" DESC);

CREATE INDEX "jobs_status_salary_max_idx" ON "jobs"("status", "salary_max" DESC);

CREATE INDEX "jobs_status_salary_min_idx" ON "jobs"("status", "salary_min");

CREATE INDEX "jobs_status_remote_type_idx" ON "jobs"("status", "remote_type");

CREATE INDEX "jobs_status_employment_type_idx" ON "jobs"("status", "employment_type");
