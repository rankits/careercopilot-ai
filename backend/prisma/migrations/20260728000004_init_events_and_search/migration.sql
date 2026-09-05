-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "locked_by" TEXT,
    "locked_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumed_events" (
    "event_id" TEXT NOT NULL,
    "consumer_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumed_events_pkey" PRIMARY KEY ("event_id", "consumer_name")
);

-- CreateTable
CREATE TABLE "index_states" (
    "job_id" TEXT NOT NULL,
    "database_version" INTEGER NOT NULL,
    "indexed_version" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "index_states_pkey" PRIMARY KEY ("job_id")
);

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at" ASC);

-- CreateIndex
CREATE INDEX "index_states_database_version_indexed_version_idx" ON "index_states"("database_version", "indexed_version");
