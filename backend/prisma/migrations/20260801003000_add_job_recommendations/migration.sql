-- CreateEnum
CREATE TYPE "RecommendationSourceType" AS ENUM ('PROFILE', 'RESUME', 'JOB', 'TARGET_TEXT', 'CAREER_GOAL', 'SAVED_SEARCH');

-- CreateEnum
CREATE TYPE "RecommendationRunStatus" AS ENUM ('PENDING', 'RETRIEVING', 'SCORING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RecommendationCategory" AS ENUM ('BEST_MATCH', 'GOOD_MATCH', 'STRETCH_OPPORTUNITY', 'RELATED_CAREER_PATH');

-- CreateEnum
CREATE TYPE "RecommendationMatchType" AS ENUM ('EXACT', 'ALIAS', 'RELATED', 'TRANSFERABLE', 'MISSING');

-- CreateEnum
CREATE TYPE "RecommendationFeedbackAction" AS ENUM ('VIEWED', 'OPENED', 'SAVED', 'APPLIED', 'DISMISSED', 'NOT_RELEVANT', 'MORE_LIKE_THIS', 'LESS_LIKE_THIS');

-- CreateEnum
CREATE TYPE "RecommendationScoreComponentName" AS ENUM ('requiredSkills', 'title', 'experience', 'responsibilities', 'preferredSkills', 'location', 'industry', 'salary', 'qualifications');

-- CreateTable
CREATE TABLE "recommendation_runs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_type" "RecommendationSourceType" NOT NULL,
    "source_id" TEXT,
    "status" "RecommendationRunStatus" NOT NULL DEFAULT 'PENDING',
    "candidate_count" INTEGER NOT NULL DEFAULT 0,
    "failure_code" TEXT,
    "configuration_version" TEXT NOT NULL DEFAULT '1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "recommendation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_recommendations" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "category" "RecommendationCategory" NOT NULL,
    "match_type" "RecommendationMatchType" NOT NULL,
    "rank" INTEGER NOT NULL,
    "matched_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "related_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missing_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reasons" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_score_components" (
    "id" TEXT NOT NULL,
    "recommendation_id" TEXT NOT NULL,
    "component" "RecommendationScoreComponentName" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "explanation_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_score_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recommendation_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "action" "RecommendationFeedbackAction" NOT NULL,
    "note" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendation_runs_user_id_created_at_idx" ON "recommendation_runs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "recommendation_runs_user_id_id_idx" ON "recommendation_runs"("user_id", "id");

-- CreateIndex
CREATE INDEX "job_recommendations_user_id_created_at_idx" ON "job_recommendations"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "job_recommendations_user_id_run_id_rank_idx" ON "job_recommendations"("user_id", "run_id", "rank");

-- CreateIndex
CREATE INDEX "job_recommendations_user_id_id_idx" ON "job_recommendations"("user_id", "id");

-- CreateIndex
CREATE INDEX "job_recommendations_job_id_idx" ON "job_recommendations"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_recommendations_run_id_job_id_key" ON "job_recommendations"("run_id", "job_id");

-- CreateIndex
CREATE INDEX "recommendation_score_components_recommendation_id_idx" ON "recommendation_score_components"("recommendation_id");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_score_components_recommendation_id_component_key" ON "recommendation_score_components"("recommendation_id", "component");

-- CreateIndex
CREATE INDEX "recommendation_feedback_user_id_job_id_idx" ON "recommendation_feedback"("user_id", "job_id");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_feedback_user_id_recommendation_id_key" ON "recommendation_feedback"("user_id", "recommendation_id");

-- AddForeignKey
ALTER TABLE "job_recommendations" ADD CONSTRAINT "job_recommendations_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "recommendation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_recommendations" ADD CONSTRAINT "job_recommendations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_score_components" ADD CONSTRAINT "recommendation_score_components_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "job_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "job_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
