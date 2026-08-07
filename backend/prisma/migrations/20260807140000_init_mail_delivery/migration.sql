-- CreateEnum
CREATE TYPE "MailDeliveryStatus" AS ENUM ('queued', 'sending', 'sent', 'failed', 'ambiguous');

-- CreateEnum
CREATE TYPE "MailDeliveryProvider" AS ENUM ('google');

-- CreateTable
CREATE TABLE "mail_deliveries" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "draft_id" UUID NOT NULL,
    "draft_version" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "connected_account_id" INTEGER NOT NULL,
    "provider" "MailDeliveryProvider" NOT NULL,
    "status" "MailDeliveryStatus" NOT NULL DEFAULT 'queued',
    "idempotency_key" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "provider_thread_id" TEXT,
    "recipient_email" TEXT NOT NULL,
    "from_email" TEXT NOT NULL,
    "resume_id" TEXT NOT NULL,
    "normalized_error_code" TEXT,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mail_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mail_deliveries_user_id_idempotency_key_key" ON "mail_deliveries"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "mail_deliveries_draft_id_created_at_idx" ON "mail_deliveries"("draft_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "mail_deliveries_user_id_created_at_idx" ON "mail_deliveries"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "mail_deliveries_status_updated_at_idx" ON "mail_deliveries"("status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "mail_deliveries_draft_id_content_hash_draft_version_status_idx" ON "mail_deliveries"("draft_id", "content_hash", "draft_version", "status");

-- AddForeignKey
ALTER TABLE "mail_deliveries" ADD CONSTRAINT "mail_deliveries_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "ai_mail_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
