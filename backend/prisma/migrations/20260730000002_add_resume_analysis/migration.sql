-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'ANALYZING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "KeywordStatus" AS ENUM ('MATCHED', 'MISSING', 'PARTIAL');

-- CreateEnum
CREATE TYPE "SuggestionImpact" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'APPLIED', 'IGNORED');

-- CreateTable
CREATE TABLE "resume_analyses" (
    "id" SERIAL NOT NULL,
    "resume_id" TEXT NOT NULL,
    "target_role" TEXT NOT NULL,
    "experience_level" TEXT NOT NULL DEFAULT 'mid',
    "job_description" TEXT,
    "ats_score" INTEGER NOT NULL DEFAULT 0,
    "keyword_match" INTEGER NOT NULL DEFAULT 0,
    "skill_match" INTEGER NOT NULL DEFAULT 0,
    "content_quality" INTEGER NOT NULL DEFAULT 0,
    "readability" INTEGER NOT NULL DEFAULT 0,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "edited_content" TEXT,
    "current_step" INTEGER NOT NULL DEFAULT 2,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_keywords" (
    "id" SERIAL NOT NULL,
    "analysis_id" INTEGER NOT NULL,
    "term" TEXT NOT NULL,
    "status" "KeywordStatus" NOT NULL DEFAULT 'MISSING',
    "importance" TEXT NOT NULL DEFAULT 'medium',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_suggestions" (
    "id" SERIAL NOT NULL,
    "analysis_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "original_text" TEXT NOT NULL,
    "suggested_text" TEXT NOT NULL,
    "impact" "SuggestionImpact" NOT NULL DEFAULT 'MEDIUM',
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_versions" (
    "id" SERIAL NOT NULL,
    "analysis_id" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ats_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resume_analyses_resume_id_idx" ON "resume_analyses"("resume_id");

-- CreateIndex
CREATE INDEX "resume_keywords_analysis_id_idx" ON "resume_keywords"("analysis_id");

-- CreateIndex
CREATE INDEX "resume_suggestions_analysis_id_idx" ON "resume_suggestions"("analysis_id");

-- CreateIndex
CREATE INDEX "resume_versions_analysis_id_idx" ON "resume_versions"("analysis_id");

-- AddForeignKey
ALTER TABLE "resume_analyses" ADD CONSTRAINT "resume_analyses_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_keywords" ADD CONSTRAINT "resume_keywords_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "resume_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_suggestions" ADD CONSTRAINT "resume_suggestions_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "resume_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "resume_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
