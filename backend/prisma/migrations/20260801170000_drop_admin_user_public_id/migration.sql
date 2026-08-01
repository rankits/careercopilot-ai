-- Align DB with auth.prisma after numeric principal IDs replaced publicId.
DROP INDEX IF EXISTS "admins_public_id_key";
DROP INDEX IF EXISTS "users_public_id_key";

ALTER TABLE "admins" DROP COLUMN IF EXISTS "public_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "public_id";
