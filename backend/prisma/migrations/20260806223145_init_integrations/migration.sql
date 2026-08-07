-- CreateEnum
CREATE TYPE "connected_account_provider" AS ENUM ('GOOGLE', 'MICROSOFT', 'OTHER_FUTURE_PROVIDER');

-- CreateEnum
CREATE TYPE "connected_account_status" AS ENUM ('PENDING', 'ACTIVE', 'REAUTHORIZATION_REQUIRED', 'REVOKED', 'ERROR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobApplicationStatus" ADD VALUE 'COULD_NOT_APPLY';
ALTER TYPE "JobApplicationStatus" ADD VALUE 'JOB_CLOSED';

-- DropIndex
DROP INDEX "job_embeddings_embedding_hnsw_idx";

-- AlterTable
ALTER TABLE "job_application_resume_analyses" ALTER COLUMN "analyzed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "job_applications" ALTER COLUMN "handoff_opened_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "extension_pairing_codes" (
    "id" SERIAL NOT NULL,
    "code_hash" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "redeemed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extension_pairing_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_devices" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extension_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connected_accounts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" "connected_account_provider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "email_address" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "granted_scopes" TEXT[],
    "encrypted_refresh_token" TEXT,
    "encrypted_access_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "credential_key_id" TEXT NOT NULL,
    "status" "connected_account_status" NOT NULL DEFAULT 'PENDING',
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_authorized_at" TIMESTAMP(3),
    "last_refreshed_at" TIMESTAMP(3),
    "reauthorization_required_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connected_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_transactions" (
    "id" TEXT NOT NULL,
    "provider" "connected_account_provider" NOT NULL,
    "user_id" INTEGER NOT NULL,
    "session_id" TEXT NOT NULL,
    "state_hash" TEXT NOT NULL,
    "pkce_verifier_encrypted" TEXT NOT NULL,
    "return_path" TEXT NOT NULL,
    "requested_scopes" TEXT[],
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extension_pairing_codes_code_hash_idx" ON "extension_pairing_codes"("code_hash");

-- CreateIndex
CREATE INDEX "extension_pairing_codes_user_id_idx" ON "extension_pairing_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "extension_devices_refresh_token_hash_key" ON "extension_devices"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "extension_devices_user_id_idx" ON "extension_devices"("user_id");

-- CreateIndex
CREATE INDEX "connected_accounts_user_id_status_idx" ON "connected_accounts"("user_id", "status");

-- CreateIndex
CREATE INDEX "connected_accounts_provider_status_idx" ON "connected_accounts"("provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "connected_accounts_provider_provider_account_id_key" ON "connected_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "connected_accounts_user_id_provider_provider_account_id_key" ON "connected_accounts"("user_id", "provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_transactions_state_hash_key" ON "oauth_transactions"("state_hash");

-- CreateIndex
CREATE INDEX "oauth_transactions_expires_at_idx" ON "oauth_transactions"("expires_at");

-- CreateIndex
CREATE INDEX "oauth_transactions_state_hash_idx" ON "oauth_transactions"("state_hash");

-- CreateIndex
CREATE INDEX "job_recommendations_run_id_rank_idx" ON "job_recommendations"("run_id", "rank");

-- AddForeignKey
ALTER TABLE "extension_pairing_codes" ADD CONSTRAINT "extension_pairing_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_devices" ADD CONSTRAINT "extension_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_transactions" ADD CONSTRAINT "oauth_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NOTE: Do not rename AI Mail indexes here. AI Mail tables are created in a
-- later migration (20260807033000_init_ai_mail_drafts). A prior Prisma drift
-- artifact incorrectly referenced those indexes and broke clean installs.

-- RenameIndex
ALTER INDEX "application_submission_attempts_job_application_id_attempt_key" RENAME TO "application_submission_attempts_job_application_id_attempt__key";

-- RenameIndex
ALTER INDEX "candidate_embeddings_user_id_source_type_source_key_provider_mo" RENAME TO "candidate_embeddings_user_id_source_type_source_key_provide_key";

-- RenameIndex
ALTER INDEX "job_application_resume_analyses_app_idx" RENAME TO "job_application_resume_analyses_job_application_id_idx";

-- RenameIndex
ALTER INDEX "job_application_resume_analyses_hash_key" RENAME TO "job_application_resume_analyses_resume_version_id_job_id_co_key";
