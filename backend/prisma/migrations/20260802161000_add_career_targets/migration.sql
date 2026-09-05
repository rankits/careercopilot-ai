CREATE TABLE "career_targets" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "goal_text" TEXT NOT NULL,
  "structured" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "archived_at" TIMESTAMP(3),

  CONSTRAINT "career_targets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "career_targets_user_id_created_at_idx"
  ON "career_targets"("user_id", "created_at" DESC);

CREATE INDEX "career_targets_user_id_id_idx"
  ON "career_targets"("user_id", "id");
