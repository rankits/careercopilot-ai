import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getJobListingMetricsSnapshot,
  recordJobListingRequest,
  resetJobListingMetricsForTests,
  setJobListingMetricsSinkForTests,
} from '@/modules/job-listing/observability/job-listing.metrics.js';

afterEach(() => {
  resetJobListingMetricsForTests();
});

describe('job-listing.metrics', () => {
  it('records latency and empty-result counters without query text', () => {
    const sink = vi.fn();
    setJobListingMetricsSinkForTests(sink);

    recordJobListingRequest({
      outcome: 'empty',
      statusCode: 200,
      durationMs: 12.6,
      hasFilters: true,
      resultCount: 0,
    });

    const snap = getJobListingMetricsSnapshot();
    expect(snap.requests).toBe(1);
    expect(snap.emptyResults).toBe(1);
    expect(snap.errors5xx).toBe(0);
    expect(snap.latencyMs).toEqual([13]);

    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'job_listing_request',
        outcome: 'empty',
        hasFilters: true,
        durationMs: 13,
      }),
    );
    const payload = JSON.stringify(sink.mock.calls[0]?.[0]);
    expect(payload).not.toMatch(/react|engineer|query/i);
  });

  it('restores the default logger sink when null is passed', () => {
    setJobListingMetricsSinkForTests(null);
    expect(() =>
      recordJobListingRequest({
        outcome: 'success',
        statusCode: 200,
        durationMs: 5,
        hasFilters: false,
        resultCount: 1,
      }),
    ).not.toThrow();
  });

  it('rounds negative durations up to zero', () => {
    setJobListingMetricsSinkForTests(null);
    recordJobListingRequest({
      outcome: 'success',
      statusCode: 200,
      durationMs: -4,
      hasFilters: false,
      resultCount: 1,
    });
    expect(getJobListingMetricsSnapshot().latencyMs).toEqual([0]);
  });

  it('counts 5xx outcomes separately', () => {
    recordJobListingRequest({
      outcome: 'error',
      statusCode: 500,
      durationMs: 40,
      hasFilters: false,
    });
    recordJobListingRequest({
      outcome: 'success',
      statusCode: 200,
      durationMs: 8,
      hasFilters: false,
      resultCount: 3,
    });

    const snap = getJobListingMetricsSnapshot();
    expect(snap.requests).toBe(2);
    expect(snap.errors5xx).toBe(1);
    expect(snap.emptyResults).toBe(0);
  });
});
