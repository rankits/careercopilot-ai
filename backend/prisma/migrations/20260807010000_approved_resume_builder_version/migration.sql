-- Pin Assisted Apply approved resumes to an optional Resume Builder version.
ALTER TABLE "approved_resume_versions"
  ADD COLUMN IF NOT EXISTS "builder_resume_version_id" INTEGER;

CREATE INDEX IF NOT EXISTS "approved_resume_versions_user_id_resume_id_idx"
  ON "approved_resume_versions"("user_id", "resume_id");
