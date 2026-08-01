-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SAVED', 'PREPARING', 'APPLIED', 'SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFER', 'ACCEPTED', 'HIRED', 'REJECTED', 'WITHDRAWN', 'GHOSTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApplicationSourceType" AS ENUM ('MANUAL', 'PLATFORM_JOB', 'PLATFORM_APPLY', 'EXTERNAL_JOB_URL', 'EMAIL_IMPORT', 'ATS_IMPORT', 'BROWSER_EXTENSION', 'CSV_IMPORT', 'EXTERNAL_API', 'AI_ASSISTED');

-- CreateEnum
CREATE TYPE "StatusChangedBy" AS ENUM ('USER', 'SYSTEM', 'IMPORT', 'AI');

-- CreateEnum
CREATE TYPE "ApplicationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "SalaryPeriod" AS ENUM ('HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('GENERAL', 'INTERVIEW', 'RECRUITER', 'PREPARATION', 'OFFER', 'REJECTION');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('FOLLOW_UP', 'PREPARE_INTERVIEW', 'COMPLETE_ASSESSMENT', 'SEND_DOCUMENT', 'RESEARCH_COMPANY', 'NEGOTIATE_OFFER', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT,
    "company_id" TEXT,
    "job_title" VARCHAR(160) NOT NULL,
    "company_name" VARCHAR(160) NOT NULL,
    "company_logo_url" TEXT,
    "original_job_url" TEXT,
    "normalised_job_url" TEXT,
    "application_url" TEXT,
    "location" VARCHAR(128),
    "remote_type" VARCHAR(32),
    "employment_type" VARCHAR(32),
    "description_snapshot" TEXT,
    "skills_snapshot" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "salary_min" DECIMAL(19,4),
    "salary_max" DECIMAL(19,4),
    "salary_currency" VARCHAR(3),
    "salary_period" "SalaryPeriod" DEFAULT 'YEAR',
    "current_status" "ApplicationStatus" NOT NULL DEFAULT 'SAVED',
    "primary_source_type" "ApplicationSourceType" NOT NULL DEFAULT 'MANUAL',
    "priority" "ApplicationPriority" NOT NULL DEFAULT 'MEDIUM',
    "interest_level" INTEGER,
    "applied_at" TIMESTAMP(3),
    "first_response_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_sources" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "source_type" "ApplicationSourceType" NOT NULL,
    "provider" TEXT,
    "external_id" TEXT,
    "external_url" TEXT,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "application_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_status_history" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "from_status" "ApplicationStatus",
    "to_status" "ApplicationStatus" NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" "StatusChangedBy" NOT NULL DEFAULT 'USER',
    "note" TEXT,
    "source_id" TEXT,

    CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_notes" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "type" "NoteType" NOT NULL DEFAULT 'GENERAL',
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_tasks" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL DEFAULT 'FOLLOW_UP',
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "applications_user_id_archived_at_current_status_updated_at_idx" ON "applications"("user_id", "archived_at", "current_status", "updated_at" DESC);
CREATE INDEX "applications_user_id_company_name_job_title_idx" ON "applications"("user_id", "company_name", "job_title");
CREATE INDEX "applications_user_id_normalised_job_url_idx" ON "applications"("user_id", "normalised_job_url");
CREATE UNIQUE INDEX "application_sources_application_id_source_type_external_id_key" ON "application_sources"("application_id", "source_type", "external_id");
CREATE INDEX "application_sources_application_id_idx" ON "application_sources"("application_id");
CREATE INDEX "application_status_history_application_id_changed_at_idx" ON "application_status_history"("application_id", "changed_at" ASC);
CREATE INDEX "application_notes_application_id_created_at_idx" ON "application_notes"("application_id", "created_at" DESC);
CREATE INDEX "application_tasks_application_id_status_due_at_idx" ON "application_tasks"("application_id", "status", "due_at");

-- AddForeignKey
ALTER TABLE "application_sources" ADD CONSTRAINT "application_sources_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_tasks" ADD CONSTRAINT "application_tasks_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
