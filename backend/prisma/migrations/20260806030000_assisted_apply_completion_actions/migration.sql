-- AA-072 / AA-073 columns
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "applied_notes" TEXT;
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "abandon_reason" VARCHAR(40);
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "abandon_note" TEXT;

-- AA-072 / AA-074 audit event types
ALTER TYPE "AutoApplyEventType" ADD VALUE IF NOT EXISTS 'MARKED_APPLIED';
ALTER TYPE "AutoApplyEventType" ADD VALUE IF NOT EXISTS 'BROKEN_LINK_REPORTED';
