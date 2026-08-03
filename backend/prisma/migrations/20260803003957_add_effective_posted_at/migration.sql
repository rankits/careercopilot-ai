ALTER TABLE "jobs" ADD COLUMN "effective_posted_at" TIMESTAMP(3);
CREATE INDEX "jobs_status_effective_posted_at_idx" ON "jobs"("status", "effective_posted_at");
