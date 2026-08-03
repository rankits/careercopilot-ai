-- AlterTable
ALTER TABLE "resume_versions" ADD COLUMN IF NOT EXISTS "target_role" TEXT;
ALTER TABLE "resume_versions" ADD COLUMN IF NOT EXISTS "job_description" TEXT;
ALTER TABLE "resume_versions" ADD COLUMN IF NOT EXISTS "resume_file_name" TEXT;
