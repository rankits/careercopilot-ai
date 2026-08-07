-- AA-093: operator bulk-repair audit event
ALTER TYPE "AutoApplyEventType" ADD VALUE IF NOT EXISTS 'LEGACY_STATUS_REPAIRED';
