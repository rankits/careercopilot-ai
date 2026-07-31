-- AlterTable
ALTER TABLE "users" ADD COLUMN "is_profile_created" BOOLEAN NOT NULL DEFAULT false;

-- Backfill from confirmed candidate profiles (user_id stores the public user id)
UPDATE "users" AS u
SET "is_profile_created" = true
WHERE EXISTS (
  SELECT 1
  FROM "candidate_profiles" AS cp
  WHERE cp."user_id" = u."public_id"
    AND cp."confirmed_at" IS NOT NULL
);
