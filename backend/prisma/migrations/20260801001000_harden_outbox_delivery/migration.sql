ALTER TABLE "outbox_events"
    ADD COLUMN "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "last_error" TEXT;

DROP INDEX "outbox_events_status_created_at_idx";

CREATE INDEX "outbox_events_status_next_attempt_at_created_at_idx"
    ON "outbox_events"("status", "next_attempt_at", "created_at" ASC);
