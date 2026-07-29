CREATE TYPE "ResumeStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED');

CREATE TYPE "ResumeStorageDriver" AS ENUM ('LOCAL', 'S3');

CREATE TABLE "resumes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "file_name" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "file_url" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "storage_driver" "ResumeStorageDriver" NOT NULL DEFAULT 'LOCAL',
  "status" "ResumeStatus" NOT NULL DEFAULT 'UPLOADED',
  "failure_reason" TEXT,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resume_extractions" (
  "id" TEXT NOT NULL,
  "resume_id" TEXT NOT NULL,
  "extracted_text" TEXT,
  "extracted_data" JSONB NOT NULL,
  "parser_version" TEXT NOT NULL,
  "confidence_score" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resume_extractions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "candidate_profiles" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "personal_details" JSONB NOT NULL DEFAULT '{}',
  "experience" JSONB NOT NULL DEFAULT '[]',
  "education" JSONB NOT NULL DEFAULT '[]',
  "skills" JSONB NOT NULL DEFAULT '[]',
  "certifications" JSONB NOT NULL DEFAULT '[]',
  "source_resume_id" TEXT,
  "confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "resumes_user_id_uploaded_at_idx" ON "resumes"("user_id", "uploaded_at" DESC);
CREATE INDEX "resumes_status_uploaded_at_idx" ON "resumes"("status", "uploaded_at");
CREATE INDEX "resume_extractions_resume_id_created_at_idx" ON "resume_extractions"("resume_id", "created_at" DESC);
CREATE UNIQUE INDEX "candidate_profiles_user_id_key" ON "candidate_profiles"("user_id");
CREATE INDEX "candidate_profiles_source_resume_id_idx" ON "candidate_profiles"("source_resume_id");

ALTER TABLE "resume_extractions"
  ADD CONSTRAINT "resume_extractions_resume_id_fkey"
  FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
