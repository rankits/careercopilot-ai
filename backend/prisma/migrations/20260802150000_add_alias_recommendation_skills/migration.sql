ALTER TABLE "job_recommendations"
ADD COLUMN "alias_skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
