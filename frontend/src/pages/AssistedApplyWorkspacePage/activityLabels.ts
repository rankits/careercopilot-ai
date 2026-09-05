/** Maps audit event types to human-readable timeline labels. Never render raw enums. */
const EVENT_LABELS: Record<string, string> = {
  SUBMISSION_INITIATED: 'Started tracking this application',
  PLAN_CREATED: 'Created an application plan',
  ELIGIBILITY_EVALUATED: 'Checked eligibility',
  CONSENT_GRANTED: 'Granted consent',
  CONSENT_REVOKED: 'Revoked consent',
  SUBMISSION_APPROVED: 'Approved for submission',
  SUBMISSION_QUEUED: 'Queued for submission',
  SUBMISSION_SUCCEEDED: 'Submission succeeded',
  SUBMISSION_FAILED: 'Submission failed',
  SUBMISSION_OUTCOME_UNKNOWN: 'Submission outcome unclear',
  SUBMISSION_CONFIRMED: 'Confirmed as submitted',
  SUBMISSION_WITHDRAWN: 'Withdrawn',
  SUBMISSION_RECLAIMED: 'Reclaimed a stuck submission',
  RESUME_CONFIRMED: 'Confirmed resume for this application',
  // Forward-compatible labels for events emitted by later tickets (AA-070+)
  ANALYSIS_COMPLETED: 'Analyzed the job posting',
  HANDOFF_OPENED: "Opened the employer's application page",
  MARKED_APPLIED: 'Marked as applied',
  BROKEN_LINK_REPORTED: 'Reported a broken apply link',
  WITHDRAWN: 'Withdrawn',
  REOPENED: 'Reopened',
};

const FALLBACK_LABEL = 'Activity recorded';

export function activityEventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? FALLBACK_LABEL;
}

export type ActivityEventCategory = 'tracking' | 'analysis' | 'handoff' | 'status' | 'other';

export function activityEventCategory(eventType: string): ActivityEventCategory {
  if (
    eventType === 'SUBMISSION_INITIATED' ||
    eventType === 'PLAN_CREATED' ||
    eventType === 'REOPENED'
  ) {
    return 'tracking';
  }
  if (eventType === 'ANALYSIS_COMPLETED' || eventType === 'ELIGIBILITY_EVALUATED') {
    return 'analysis';
  }
  if (
    eventType === 'HANDOFF_OPENED' ||
    eventType === 'MARKED_APPLIED' ||
    eventType === 'BROKEN_LINK_REPORTED'
  ) {
    return 'handoff';
  }
  if (
    eventType.startsWith('SUBMISSION_') ||
    eventType === 'WITHDRAWN' ||
    eventType === 'CONSENT_GRANTED' ||
    eventType === 'CONSENT_REVOKED'
  ) {
    return 'status';
  }
  return 'other';
}

export function formatRelativeTime(isoOrDate: string | Date, now = new Date()): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const diffMs = date.getTime() - now.getTime();
  const absSec = Math.round(Math.abs(diffMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), 'second');
  const absMin = Math.round(absSec / 60);
  if (absMin < 60) return rtf.format(Math.round(diffMs / 60_000), 'minute');
  const absHr = Math.round(absMin / 60);
  if (absHr < 48) return rtf.format(Math.round(diffMs / 3_600_000), 'hour');
  const absDay = Math.round(absHr / 24);
  if (absDay < 30) return rtf.format(Math.round(diffMs / 86_400_000), 'day');
  const absMonth = Math.round(absDay / 30);
  if (absMonth < 12) return rtf.format(Math.round(diffMs / 2_592_000_000), 'month');
  return rtf.format(Math.round(diffMs / 31_536_000_000), 'year');
}

/** Analysis older than this many days shows a non-blocking staleness advisory (AA-051). */
export const ANALYSIS_STALENESS_DAYS = 7;

export function analysisAgeDays(analyzedAt: string | Date, now = new Date()): number {
  const date = typeof analyzedAt === 'string' ? new Date(analyzedAt) : analyzedAt;
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

export function isAnalysisStale(analyzedAt: string | Date, now = new Date()): boolean {
  return analysisAgeDays(analyzedAt, now) >= ANALYSIS_STALENESS_DAYS;
}
