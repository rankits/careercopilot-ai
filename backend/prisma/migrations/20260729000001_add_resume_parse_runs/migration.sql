CREATE TYPE "ResumeParseStatus" AS ENUM (
  'QUEUED',
  'EXTRACTING_TEXT',
  'CHECKING_EXTRACTION',
  'PARSING',
  'VALIDATING',
  'NORMALISING',
  'COMPLETED',
  'NEEDS_REVIEW',
  'FAILED'
);

CREATE TABLE "resume_parse_runs" (
  "id" TEXT NOT NULL,
  "resume_id" TEXT NOT NULL,
  "status" "ResumeParseStatus" NOT NULL,
  "attempt_number" INTEGER NOT NULL DEFAULT 1,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "prompt_version" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "source_hash" TEXT,
  "extracted_text_hash" TEXT,
  "parsed_data" JSONB,
  "confidence" DOUBLE PRECISION,
  "warnings" JSONB,
  "requires_review" BOOLEAN NOT NULL DEFAULT false,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "latency_ms" INTEGER,
  "error_code" TEXT,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resume_parse_runs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "resume_extractions"
  ADD COLUMN "parse_run_id" TEXT;

CREATE UNIQUE INDEX "resume_extractions_parse_run_id_key" ON "resume_extractions"("parse_run_id");
CREATE INDEX "resume_parse_runs_resume_id_created_at_idx" ON "resume_parse_runs"("resume_id", "created_at" DESC);

ALTER TABLE "resume_parse_runs"
  ADD CONSTRAINT "resume_parse_runs_resume_id_fkey"
  FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resume_extractions"
  ADD CONSTRAINT "resume_extractions_parse_run_id_fkey"
  FOREIGN KEY ("parse_run_id") REFERENCES "resume_parse_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
