-- Application-specific Candidate Profile → Job Match (no resume content).
CREATE TABLE IF NOT EXISTS "job_application_profile_matches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_application_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "analysis_id" TEXT,
    "content_hash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "matched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_application_profile_matches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "job_application_profile_matches_job_application_id_key"
  ON "job_application_profile_matches"("job_application_id");

CREATE INDEX IF NOT EXISTS "job_application_profile_matches_user_id_job_id_idx"
  ON "job_application_profile_matches"("user_id", "job_id");
