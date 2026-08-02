CREATE TABLE "saved_searches" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "query" TEXT,
  "filters" JSONB NOT NULL DEFAULT '{}',
  "context" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "saved_searches_user_id_created_at_idx"
  ON "saved_searches"("user_id", "created_at" DESC);

CREATE INDEX "saved_searches_user_id_id_idx"
  ON "saved_searches"("user_id", "id");
