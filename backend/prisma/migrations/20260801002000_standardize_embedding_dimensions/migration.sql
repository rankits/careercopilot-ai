DROP INDEX "job_embeddings_embedding_hnsw_idx";

ALTER TABLE "job_embeddings"
    DROP CONSTRAINT "job_embeddings_dimensions_check";

ALTER TABLE "job_embeddings"
    ALTER COLUMN "embedding" TYPE vector(768)
    USING subvector("embedding", 1, 768)::vector(768),
    ALTER COLUMN "dimensions" SET DEFAULT 768;

UPDATE "job_embeddings"
SET "dimensions" = 768;

ALTER TABLE "job_embeddings"
    ADD CONSTRAINT "job_embeddings_dimensions_check" CHECK ("dimensions" = 768);

CREATE INDEX "job_embeddings_embedding_hnsw_idx"
    ON "job_embeddings"
    USING hnsw ("embedding" vector_cosine_ops);
