-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('GREENHOUSE', 'LEVER', 'ARBEITNOW', 'PUBLIC_FEED');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "canonical_hash" TEXT NOT NULL,
    "company_slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "employment_type" TEXT,
    "remote_type" TEXT,
    "description_html" TEXT NOT NULL,
    "description_text" TEXT NOT NULL,
    "salary_min" DOUBLE PRECISION,
    "salary_max" DOUBLE PRECISION,
    "currency" VARCHAR(10),
    "skills" JSONB NOT NULL DEFAULT '[]',
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "provider_metadata" JSONB NOT NULL DEFAULT '{}',
    "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "first_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL,
    "last_checked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_sources" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "provider_job_id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 60,
    "apply_url" TEXT,
    "raw_metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_slug_verified_idx" ON "companies"("slug", "verified");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_canonical_hash_key" ON "jobs"("canonical_hash");

-- CreateIndex
CREATE INDEX "jobs_status_last_seen_idx" ON "jobs"("status", "last_seen");

-- CreateIndex
CREATE INDEX "jobs_company_slug_title_idx" ON "jobs"("company_slug", "title");

-- CreateIndex
CREATE UNIQUE INDEX "job_sources_provider_provider_job_id_key" ON "job_sources"("provider", "provider_job_id");

-- CreateIndex
CREATE INDEX "job_sources_job_id_priority_idx" ON "job_sources"("job_id", "priority" DESC);

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_slug_fkey" FOREIGN KEY ("company_slug") REFERENCES "companies"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_sources" ADD CONSTRAINT "job_sources_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
