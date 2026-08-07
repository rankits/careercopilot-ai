-- Phase 1B AI Mail persistence. User and resume identifiers intentionally have
-- no cross-domain foreign keys: users use integer IDs and resumes hard-delete.
CREATE TYPE "AiMailDraftStatus" AS ENUM (
  'input',
  'generating',
  'generated',
  'edited',
  'generation_failed',
  'ready_to_send',
  'archived'
);

CREATE TYPE "AiMailGenerationAttemptStatus" AS ENUM ('started', 'succeeded', 'failed', 'cancelled');

CREATE TABLE "ai_mail_drafts" (
  "id" UUID NOT NULL,
  "user_id" TEXT NOT NULL,
  "recruiter_email" TEXT NOT NULL,
  "recruiter_name" TEXT,
  "company_name" TEXT,
  "role_title" TEXT,
  "job_url" TEXT,
  "job_description" TEXT NOT NULL,
  "additional_context" TEXT,
  "resume_id" TEXT NOT NULL,
  "profile_snapshot_id" TEXT,
  "constraints" JSONB NOT NULL,
  "subject" TEXT,
  "body_text" TEXT,
  "body_html" TEXT,
  "status" "AiMailDraftStatus" NOT NULL DEFAULT 'input',
  "version" INTEGER NOT NULL DEFAULT 1,
  "provider" TEXT,
  "provider_model" TEXT,
  "provider_request_id" TEXT,
  "generated_at" TIMESTAMP(3),
  "user_edited" BOOLEAN NOT NULL DEFAULT false,
  "content_hash" TEXT,
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ai_mail_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_mail_generation_attempts" (
  "id" UUID NOT NULL,
  "draft_id" UUID NOT NULL,
  "user_id" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "provider_name" TEXT NOT NULL,
  "provider_model" TEXT,
  "status" "AiMailGenerationAttemptStatus" NOT NULL DEFAULT 'started',
  "duration_ms" INTEGER,
  "input_token_count" INTEGER,
  "output_token_count" INTEGER,
  "provider_request_id" TEXT,
  "normalized_error_code" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_mail_generation_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_mail_generation_attempts_draft_id_fkey"
    FOREIGN KEY ("draft_id") REFERENCES "ai_mail_drafts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ai_mail_drafts_user_id_updated_at_idx"
  ON "ai_mail_drafts"("user_id", "updated_at" DESC);
CREATE INDEX "ai_mail_drafts_resume_id_idx" ON "ai_mail_drafts"("resume_id");
CREATE INDEX "ai_mail_drafts_user_id_status_updated_at_idx"
  ON "ai_mail_drafts"("user_id", "status", "updated_at" DESC);
CREATE INDEX "ai_mail_generation_attempts_draft_id_created_at_idx"
  ON "ai_mail_generation_attempts"("draft_id", "created_at" DESC);
CREATE INDEX "ai_mail_generation_attempts_user_id_created_at_idx"
  ON "ai_mail_generation_attempts"("user_id", "created_at" DESC);
CREATE INDEX "ai_mail_generation_attempts_provider_name_normalized_error__idx"
  ON "ai_mail_generation_attempts"("provider_name", "normalized_error_code", "created_at" DESC);
CREATE INDEX "ai_mail_generation_attempts_provider_request_id_idx"
  ON "ai_mail_generation_attempts"("provider_request_id");

-- Rollback (manual, feature-only):
-- DROP TABLE "ai_mail_generation_attempts";
-- DROP TABLE "ai_mail_drafts";
-- DROP TYPE "AiMailGenerationAttemptStatus";
-- DROP TYPE "AiMailDraftStatus";
