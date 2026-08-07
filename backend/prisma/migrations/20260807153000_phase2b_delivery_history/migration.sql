-- Rename MailDeliveryStatus values: queued→pending, ambiguous→unknown; add cancelled
ALTER TYPE "MailDeliveryStatus" RENAME VALUE 'queued' TO 'pending';
ALTER TYPE "MailDeliveryStatus" RENAME VALUE 'ambiguous' TO 'unknown';
ALTER TYPE "MailDeliveryStatus" ADD VALUE IF NOT EXISTS 'cancelled';

-- User resolution for unknown deliveries (does not overwrite provider status)
CREATE TYPE "MailDeliveryUserResolution" AS ENUM ('confirmed_sent', 'confirmed_not_sent');

-- Snapshot + privacy hash + resolution columns
ALTER TABLE "mail_deliveries"
  ADD COLUMN IF NOT EXISTS "recipient_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "subject_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "company_name_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "role_title_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "user_resolution" "MailDeliveryUserResolution",
  ADD COLUMN IF NOT EXISTS "user_resolved_at" TIMESTAMP(3);

-- Backfill display snapshots from current draft (best-effort for existing rows)
UPDATE "mail_deliveries" AS md
SET
  "subject_snapshot" = COALESCE(md."subject_snapshot", d.subject),
  "company_name_snapshot" = COALESCE(md."company_name_snapshot", d.company_name),
  "role_title_snapshot" = COALESCE(md."role_title_snapshot", d.role_title)
FROM "ai_mail_drafts" AS d
WHERE d.id = md.draft_id
  AND (
    md."subject_snapshot" IS NULL
    OR md."company_name_snapshot" IS NULL
    OR md."role_title_snapshot" IS NULL
  );

-- Follow-up link on drafts
ALTER TABLE "ai_mail_drafts"
  ADD COLUMN IF NOT EXISTS "follow_up_to_delivery_id" UUID;

CREATE INDEX IF NOT EXISTS "ai_mail_drafts_follow_up_to_delivery_id_idx"
  ON "ai_mail_drafts"("follow_up_to_delivery_id");

ALTER TABLE "ai_mail_drafts"
  ADD CONSTRAINT "ai_mail_drafts_follow_up_to_delivery_id_fkey"
  FOREIGN KEY ("follow_up_to_delivery_id") REFERENCES "mail_deliveries"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "mail_deliveries_user_id_recipient_hash_created_at_idx"
  ON "mail_deliveries"("user_id", "recipient_hash", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "mail_deliveries_user_id_status_created_at_idx"
  ON "mail_deliveries"("user_id", "status", "created_at" DESC);
