-- pgvector is required for cosine-distance search over job embeddings.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "job_embeddings" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "model" VARCHAR(200) NOT NULL,
    "dimensions" INTEGER NOT NULL DEFAULT 1536,
    "content_hash" CHAR(64) NOT NULL,
    "job_version" INTEGER NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_embeddings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "job_embeddings_dimensions_check" CHECK ("dimensions" = 1536),
    CONSTRAINT "job_embeddings_job_version_check" CHECK ("job_version" > 0)
);

CREATE UNIQUE INDEX "job_embeddings_job_id_provider_model_key"
    ON "job_embeddings"("job_id", "provider", "model");

CREATE INDEX "job_embeddings_provider_model_job_version_idx"
    ON "job_embeddings"("provider", "model", "job_version");

CREATE INDEX "job_embeddings_content_hash_idx"
    ON "job_embeddings"("content_hash");

CREATE INDEX "job_embeddings_embedding_hnsw_idx"
    ON "job_embeddings"
    USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "job_embeddings"
    ADD CONSTRAINT "job_embeddings_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "jobs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
