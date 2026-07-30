-- CreateTable: raw_jobs with native PostgreSQL monthly range partitioning
CREATE TABLE "raw_jobs" (
    "id" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "provider_job_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_jobs_pkey" PRIMARY KEY ("id", "fetched_at")
) PARTITION BY RANGE ("fetched_at");

-- Create default partitions for current and next month
CREATE TABLE "raw_jobs_2026_07" PARTITION OF "raw_jobs"
    FOR VALUES FROM ('2026-07-01 00:00:00') TO ('2026-08-01 00:00:00');

CREATE TABLE "raw_jobs_2026_08" PARTITION OF "raw_jobs"
    FOR VALUES FROM ('2026-08-01 00:00:00') TO ('2026-09-01 00:00:00');

-- CreateIndex on raw_jobs
CREATE UNIQUE INDEX "raw_jobs_provider_provider_job_id_version_fetched_at_key" ON "raw_jobs"("provider", "provider_job_id", "version", "fetched_at");

CREATE INDEX "raw_jobs_checksum_idx" ON "raw_jobs"("checksum");

CREATE INDEX "raw_jobs_provider_provider_job_id_idx" ON "raw_jobs"("provider", "provider_job_id");

-- CreateTable
CREATE TABLE "aggregation_runs" (
    "id" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "status" TEXT NOT NULL,
    "jobs_fetched" INTEGER NOT NULL DEFAULT 0,
    "jobs_inserted" INTEGER NOT NULL DEFAULT 0,
    "jobs_updated" INTEGER NOT NULL DEFAULT 0,
    "jobs_skipped_unchanged" INTEGER NOT NULL DEFAULT 0,
    "jobs_failed" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER NOT NULL,
    "errors" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aggregation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_health" (
    "provider" "ProviderType" NOT NULL,
    "success_rate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "failure_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avg_response_time_ms" INTEGER NOT NULL DEFAULT 0,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "rate_limit_remaining" INTEGER NOT NULL DEFAULT 100,
    "circuit_state" TEXT NOT NULL DEFAULT 'HEALTHY',
    "last_checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_health_pkey" PRIMARY KEY ("provider")
);

-- CreateTable
CREATE TABLE "failed_jobs" (
    "id" TEXT NOT NULL,
    "aggregation_run_id" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "provider_job_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error_reason" TEXT NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "failed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failed_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aggregation_runs_provider_completed_at_idx" ON "aggregation_runs"("provider", "completed_at" DESC);

-- CreateIndex
CREATE INDEX "failed_jobs_provider_failed_at_idx" ON "failed_jobs"("provider", "failed_at" DESC);
