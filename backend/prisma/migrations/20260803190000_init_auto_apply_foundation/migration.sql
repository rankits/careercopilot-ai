-- CreateEnum
CREATE TYPE "AutoApplyChannel" AS ENUM ('EMAIL', 'EXTERNAL_MANUAL', 'ATS_API', 'BROWSER_ASSISTED', 'UNSUPPORTED');

-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('DISCOVERED', 'MATCHED', 'NOT_ELIGIBLE', 'APPLICATION_PLANNING', 'INFORMATION_REQUIRED', 'READY_FOR_REVIEW', 'READY_FOR_AUTOPILOT', 'APPROVED', 'QUEUED', 'SUBMITTING', 'SUBMITTED', 'CONFIRMATION_RECEIVED', 'SUBMISSION_FAILED', 'ACTION_REQUIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ApprovalMode" AS ENUM ('PER_APPLICATION', 'BULK_APPROVED', 'AUTOPILOT');

-- CreateEnum
CREATE TYPE "SubmissionAttemptOutcome" AS ENUM ('SUCCEEDED', 'FAILED_SAFE_TO_RETRY', 'FAILED_DO_NOT_RETRY', 'SUBMISSION_OUTCOME_UNKNOWN');

-- CreateEnum
CREATE TYPE "AnswerSource" AS ENUM ('USER_VERIFIED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('RESUME_USAGE', 'CONTENT_GENERATION', 'EMAIL_SUBMISSION', 'AUTOPILOT_SUBMISSION');

-- CreateTable
CREATE TABLE "candidate_application_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "links" JSONB NOT NULL DEFAULT '{}',
    "verification" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_application_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_answer_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_key" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "source" "AnswerSource" NOT NULL DEFAULT 'USER_VERIFIED',
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "auto_submit_allowed" BOOLEAN NOT NULL DEFAULT false,
    "last_verified_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_answer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approved_resume_versions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resume_id" TEXT NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "category" VARCHAR(60) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approved_resume_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_rules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "min_match_score" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "daily_application_limit" INTEGER NOT NULL DEFAULT 5,
    "weekly_application_limit" INTEGER,
    "blacklisted_company_slugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excluded_title_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excluded_sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "autopilot_enabled" BOOLEAN NOT NULL DEFAULT false,
    "autopilot_paused_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "application_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT,
    "normalised_job_url" TEXT,
    "canonical_job_id" TEXT,
    "channel" "AutoApplyChannel" NOT NULL DEFAULT 'UNSUPPORTED',
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'DISCOVERED',
    "approval_mode" "ApprovalMode" NOT NULL DEFAULT 'PER_APPLICATION',
    "match_score" DOUBLE PRECISION,
    "eligibility_result" JSONB,
    "resume_version_id" TEXT,
    "cover_letter_content" TEXT,
    "consent_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "queued_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "external_application_id" TEXT,
    "external_confirmation_url" TEXT,
    "failure_code" TEXT,
    "failure_message" TEXT,
    "plan_inputs_hash" TEXT,
    "plan_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_submission_attempts" (
    "id" TEXT NOT NULL,
    "job_application_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "outcome" "SubmissionAttemptOutcome",
    "raw_response_sanitized" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "application_submission_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_application_profiles_user_id_key" ON "candidate_application_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_answer_profiles_user_id_question_key_key" ON "application_answer_profiles"("user_id", "question_key");
CREATE INDEX "application_answer_profiles_user_id_idx" ON "application_answer_profiles"("user_id");

-- CreateIndex
CREATE INDEX "approved_resume_versions_user_id_is_active_idx" ON "approved_resume_versions"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "application_rules_user_id_key" ON "application_rules"("user_id");

-- CreateIndex
CREATE INDEX "application_consents_user_id_consent_type_revoked_at_idx" ON "application_consents"("user_id", "consent_type", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_user_id_job_id_key" ON "job_applications"("user_id", "job_id");
CREATE UNIQUE INDEX "job_applications_user_id_normalised_job_url_key" ON "job_applications"("user_id", "normalised_job_url");
CREATE INDEX "job_applications_user_id_status_idx" ON "job_applications"("user_id", "status");
CREATE INDEX "job_applications_user_id_canonical_job_id_idx" ON "job_applications"("user_id", "canonical_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_submission_attempts_job_application_id_attempt_key" ON "application_submission_attempts"("job_application_id", "attempt_number");
CREATE INDEX "application_submission_attempts_job_application_id_idx" ON "application_submission_attempts"("job_application_id");

-- AddForeignKey
ALTER TABLE "application_submission_attempts" ADD CONSTRAINT "application_submission_attempts_job_application_id_fkey" FOREIGN KEY ("job_application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
