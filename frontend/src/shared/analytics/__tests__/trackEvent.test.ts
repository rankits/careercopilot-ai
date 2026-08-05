import { describe, expect, it, beforeEach } from 'vitest';

import {
  __analyticsTestUtils,
  clearAnalyticsDebugBuffer,
  getAnalyticsDebugBuffer,
  setAnalyticsSink,
  trackEvent,
} from '../trackEvent';

describe('trackEvent (AA-083)', () => {
  beforeEach(() => {
    clearAnalyticsDebugBuffer();
    setAnalyticsSink(null);
  });

  it('records events in the debug buffer', () => {
    trackEvent('assisted_apply_cta_clicked', { job_id: 'job-1' });
    expect(getAnalyticsDebugBuffer()).toHaveLength(1);
    expect(getAnalyticsDebugBuffer()[0]?.event).toBe('assisted_apply_cta_clicked');
    expect(getAnalyticsDebugBuffer()[0]?.properties).toEqual({ job_id: 'job-1' });
  });

  it('strips forbidden property keys (PII / free text)', () => {
    const sanitized = __analyticsTestUtils.sanitizeProperties({
      job_application_id: 'app-1',
      notes: 'secret note',
      reasonCode: 'BROKEN_LINK',
      email: 'x@y.com',
    });
    expect(sanitized).toEqual({
      job_application_id: 'app-1',
      reasonCode: 'BROKEN_LINK',
    });
    expect(sanitized).not.toHaveProperty('notes');
    expect(sanitized).not.toHaveProperty('email');
  });

  it('never throws when the sink fails', () => {
    setAnalyticsSink(() => {
      throw new Error('sink down');
    });
    expect(() => trackEvent('mark_applied', { job_application_id: 'a' })).not.toThrow();
  });
});
