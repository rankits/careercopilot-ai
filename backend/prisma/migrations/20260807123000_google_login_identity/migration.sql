-- Sign-in-with-Google identity fields (separate from Connected Accounts mailbox OAuth).
-- Rollback (manual):
--   DROP TABLE "google_login_transactions";
--   ALTER TABLE "users" DROP COLUMN IF EXISTS "google_sub";

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_sub" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_google_sub_key" ON "users"("google_sub");

CREATE TABLE IF NOT EXISTS "google_login_transactions" (
  "id" TEXT NOT NULL,
  "state_hash" TEXT NOT NULL,
  "pkce_verifier_encrypted" TEXT NOT NULL,
  "return_path" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "google_login_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "google_login_transactions_state_hash_key"
  ON "google_login_transactions"("state_hash");

CREATE INDEX IF NOT EXISTS "google_login_transactions_expires_at_idx"
  ON "google_login_transactions"("expires_at");
