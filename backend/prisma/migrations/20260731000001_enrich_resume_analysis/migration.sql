-- AlterTable
ALTER TABLE "resume_analyses" ADD COLUMN IF NOT EXISTS "formatting_score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "resume_analyses" ADD COLUMN IF NOT EXISTS "analysis_details" JSONB;

-- AlterTable
ALTER TABLE "resume_suggestions" ADD COLUMN IF NOT EXISTS "reason" TEXT NOT NULL DEFAULT '';
