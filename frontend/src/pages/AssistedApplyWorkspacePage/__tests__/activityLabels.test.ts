import { describe, expect, it } from 'vitest';

import {
  activityEventLabel,
  analysisAgeDays,
  formatRelativeTime,
  isAnalysisStale,
} from '../activityLabels';

describe('activityEventLabel', () => {
  it('maps known event types to plain language', () => {
    expect(activityEventLabel('SUBMISSION_INITIATED')).toBe(
      'Started tracking this application',
    );
    expect(activityEventLabel('HANDOFF_OPENED')).toBe(
      "Opened the employer's application page",
    );
    expect(activityEventLabel('ANALYSIS_COMPLETED')).toBe('Analyzed the job posting');
    expect(activityEventLabel('MARKED_APPLIED')).toBe('Marked as applied');
    expect(activityEventLabel('BROKEN_LINK_REPORTED')).toBe('Reported a broken apply link');
  });

  it('uses a safe fallback for unknown types — never the raw enum', () => {
    expect(activityEventLabel('SOME_FUTURE_EVENT')).toBe('Activity recorded');
    expect(activityEventLabel('SOME_FUTURE_EVENT')).not.toContain('SOME_FUTURE');
  });
});

describe('formatRelativeTime', () => {
  it('formats recent times', () => {
    const now = new Date('2026-08-06T12:00:00Z');
    const twoHoursAgo = new Date('2026-08-06T10:00:00Z');
    expect(formatRelativeTime(twoHoursAgo, now)).toMatch(/hour/i);
  });
});

describe('analysis staleness (AA-051)', () => {
  it('flags analyses older than the threshold', () => {
    const now = new Date('2026-08-06T12:00:00Z');
    expect(isAnalysisStale('2026-07-20T12:00:00Z', now)).toBe(true);
    expect(isAnalysisStale('2026-08-05T12:00:00Z', now)).toBe(false);
    expect(analysisAgeDays('2026-07-30T12:00:00Z', now)).toBe(7);
  });
});
