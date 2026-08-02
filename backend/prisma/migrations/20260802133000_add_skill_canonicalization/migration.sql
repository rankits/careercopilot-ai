CREATE TABLE "skill_canonicals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_canonicals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_aliases" (
    "id" TEXT NOT NULL,
    "canonical_id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized_alias" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skill_canonicals_name_key" ON "skill_canonicals"("name");
CREATE UNIQUE INDEX "skill_canonicals_normalized_name_key" ON "skill_canonicals"("normalized_name");
CREATE UNIQUE INDEX "skill_aliases_normalized_alias_key" ON "skill_aliases"("normalized_alias");
CREATE INDEX "skill_aliases_canonical_id_idx" ON "skill_aliases"("canonical_id");

ALTER TABLE "skill_aliases"
ADD CONSTRAINT "skill_aliases_canonical_id_fkey"
FOREIGN KEY ("canonical_id") REFERENCES "skill_canonicals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
