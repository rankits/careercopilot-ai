CREATE TYPE "SkillRelationshipType" AS ENUM ('RELATED', 'TRANSFERABLE');

CREATE TABLE "skill_relationships" (
    "id" TEXT NOT NULL,
    "from_skill_id" TEXT NOT NULL,
    "to_skill_id" TEXT NOT NULL,
    "type" "SkillRelationshipType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_relationships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skill_relationships_from_skill_id_to_skill_id_type_key"
ON "skill_relationships"("from_skill_id", "to_skill_id", "type");

CREATE INDEX "skill_relationships_from_skill_id_idx"
ON "skill_relationships"("from_skill_id");

CREATE INDEX "skill_relationships_to_skill_id_idx"
ON "skill_relationships"("to_skill_id");

ALTER TABLE "skill_relationships"
ADD CONSTRAINT "skill_relationships_from_skill_id_fkey"
FOREIGN KEY ("from_skill_id") REFERENCES "skill_canonicals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "skill_relationships"
ADD CONSTRAINT "skill_relationships_to_skill_id_fkey"
FOREIGN KEY ("to_skill_id") REFERENCES "skill_canonicals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
