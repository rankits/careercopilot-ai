CREATE TABLE "candidate_embeddings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_type" "RecommendationSourceType" NOT NULL,
    "source_id" TEXT,
    "source_key" TEXT NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "model" VARCHAR(200) NOT NULL,
    "dimensions" INTEGER NOT NULL DEFAULT 768,
    "content_hash" CHAR(64) NOT NULL,
    "embedding" vector(768) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_embeddings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "candidate_embeddings_user_id_source_type_source_key_provider_model_key"
ON "candidate_embeddings"("user_id", "source_type", "source_key", "provider", "model");

CREATE INDEX "candidate_embeddings_user_id_source_type_source_key_idx"
ON "candidate_embeddings"("user_id", "source_type", "source_key");

CREATE INDEX "candidate_embeddings_content_hash_idx"
ON "candidate_embeddings"("content_hash");
