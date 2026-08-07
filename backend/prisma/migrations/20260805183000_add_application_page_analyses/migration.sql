-- Pre-Application Intelligence: job page analysis snapshots (facts + evidence only).
CREATE TABLE IF NOT EXISTS "application_page_analyses" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "job_application_id" TEXT,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "extractor_version" VARCHAR(64) NOT NULL,
    "extraction_policy_version" VARCHAR(64) NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "job_page_url" TEXT NOT NULL,
    "application_url" TEXT,
    "job_page_status" VARCHAR(32) NOT NULL,
    "form_status" VARCHAR(32) NOT NULL,
    "submission_capability" VARCHAR(32) NOT NULL,
    "outcome_status" VARCHAR(48) NOT NULL,
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "fields" JSONB NOT NULL DEFAULT '[]',
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "freshness" JSONB NOT NULL DEFAULT '{}',
    "sanitized_text" TEXT,
    "content_hash" VARCHAR(64) NOT NULL,
    "idempotency_key" VARCHAR(191) NOT NULL,
    "analyzed_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_page_analyses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "application_page_analyses_idempotency_key_key"
  ON "application_page_analyses"("idempotency_key");

CREATE INDEX IF NOT EXISTS "application_page_analyses_job_id_analyzed_at_idx"
  ON "application_page_analyses"("job_id", "analyzed_at" DESC);

CREATE INDEX IF NOT EXISTS "application_page_analyses_job_id_expires_at_idx"
  ON "application_page_analyses"("job_id", "expires_at");