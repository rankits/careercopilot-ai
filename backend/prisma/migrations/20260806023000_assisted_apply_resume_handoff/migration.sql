-- AA-070: record when candidate opened employer apply URL (direct handoff, no queue).
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "handoff_opened_at" TIMESTAMPTZ;

-- AA-063 / AA-070 audit event types
ALTER TYPE "AutoApplyEventType" ADD VALUE IF NOT EXISTS 'RESUME_CONFIRMED';
ALTER TYPE "AutoApplyEventType" ADD VALUE IF NOT EXISTS 'HANDOFF_OPENED';

-- AA-061: cached resume-vs-job analysis keyed by content hash
CREATE TABLE IF NOT EXISTS "job_application_resume_analyses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_application_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "resume_version_id" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "analyzed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_application_resume_analyses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "job_application_resume_analyses_hash_key"
  ON "job_application_resume_analyses"("resume_version_id", "job_id", "content_hash");

CREATE INDEX IF NOT EXISTS "job_application_resume_analyses_app_idx"
  ON "job_application_resume_analyses"("job_application_id");
