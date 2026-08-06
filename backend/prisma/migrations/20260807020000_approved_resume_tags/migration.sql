-- Keep approved resume metadata aligned with the Prisma model.
ALTER TABLE "approved_resume_versions"
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
