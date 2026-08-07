-- Phase 1D: revision history + generation-attempt metadata for orchestration.
-- Reversible (manual): drop revisions table/enum and nullable attempt columns.

CREATE TYPE "AiMailRevisionSource" AS ENUM (
  'ai_generated',
  'ai_regenerated',
  'user_saved',
  'restored'
);

ALTER TABLE "ai_mail_drafts"
  ADD COLUMN IF NOT EXISTS "last_context_hash" TEXT;

ALTER TABLE "ai_mail_generation_attempts"
  ADD COLUMN IF NOT EXISTS "context_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "prompt_version" TEXT,
  ADD COLUMN IF NOT EXISTS "output_schema_version" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "ai_mail_draft_revisions" (
  "id" UUID NOT NULL,
  "draft_id" UUID NOT NULL,
  "draft_version" INTEGER NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "source" "AiMailRevisionSource" NOT NULL,
  "operation" TEXT,
  "subject" TEXT,
  "body_text" TEXT,
  "context_hash" TEXT,
  "prompt_version" TEXT,
  "provider_name" TEXT,
  "provider_model" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_mail_draft_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_mail_draft_revisions_draft_id_fkey"
    FOREIGN KEY ("draft_id") REFERENCES "ai_mail_drafts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ai_mail_draft_revisions_draft_id_revision_number_key"
  ON "ai_mail_draft_revisions"("draft_id", "revision_number");
CREATE INDEX "ai_mail_draft_revisions_draft_id_created_at_idx"
  ON "ai_mail_draft_revisions"("draft_id", "created_at" DESC);

-- Partial unique index: idempotency keys are unique when present.
CREATE UNIQUE INDEX "ai_mail_generation_attempts_user_draft_op_idem_key"
  ON "ai_mail_generation_attempts"("user_id", "draft_id", "operation", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

-- Rollback (manual):
-- DROP TABLE "ai_mail_draft_revisions";
-- DROP TYPE "AiMailRevisionSource";
-- ALTER TABLE "ai_mail_generation_attempts"
--   DROP COLUMN IF EXISTS "context_hash",
--   DROP COLUMN IF EXISTS "prompt_version",
--   DROP COLUMN IF EXISTS "output_schema_version",
--   DROP COLUMN IF EXISTS "idempotency_key",
--   DROP COLUMN IF EXISTS "updated_at";
-- ALTER TABLE "ai_mail_drafts" DROP COLUMN IF EXISTS "last_context_hash";
