-- CreateEnum
CREATE TYPE "AutoApplyEventType" AS ENUM ('PLAN_CREATED', 'ELIGIBILITY_EVALUATED', 'CONSENT_GRANTED', 'CONSENT_REVOKED', 'SUBMISSION_INITIATED', 'SUBMISSION_APPROVED', 'SUBMISSION_QUEUED', 'SUBMISSION_SUCCEEDED', 'SUBMISSION_FAILED', 'SUBMISSION_OUTCOME_UNKNOWN', 'SUBMISSION_CONFIRMED', 'SUBMISSION_WITHDRAWN');

-- CreateTable
CREATE TABLE "auto_apply_audit_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_application_id" TEXT,
    "event_type" "AutoApplyEventType" NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_apply_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auto_apply_audit_events_user_id_created_at_idx" ON "auto_apply_audit_events"("user_id", "created_at" DESC);
CREATE INDEX "auto_apply_audit_events_job_application_id_created_at_idx" ON "auto_apply_audit_events"("job_application_id", "created_at" DESC);
CREATE INDEX "auto_apply_audit_events_event_type_created_at_idx" ON "auto_apply_audit_events"("event_type", "created_at");
