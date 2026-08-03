ALTER TABLE "job_recommendations"
ADD COLUMN "transferable_skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
