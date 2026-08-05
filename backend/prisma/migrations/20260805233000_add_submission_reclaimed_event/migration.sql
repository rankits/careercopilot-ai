-- AlterEnum: reclaim audit event for stuck SUBMITTING applications (AA-007)
ALTER TYPE "AutoApplyEventType" ADD VALUE IF NOT EXISTS 'SUBMISSION_RECLAIMED';
