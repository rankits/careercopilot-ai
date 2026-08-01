ALTER TABLE "consumed_events"
    ADD COLUMN "locked_by" TEXT,
    ADD COLUMN "locked_at" TIMESTAMP(3),
    ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 1;
