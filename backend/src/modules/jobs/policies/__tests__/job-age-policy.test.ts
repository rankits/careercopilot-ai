import { afterEach, describe, expect, it } from 'vitest';
import { env } from '@/shared/config/env.conf.js';
import { JobAgePolicy } from '@/modules/jobs/policies/job-age-policy.js';

const snapshot = {
  JOB_STORAGE_AGE_FILTER_ENABLED: env.JOB_STORAGE_AGE_FILTER_ENABLED,
  JOB_STORAGE_MAX_AGE_MONTHS: env.JOB_STORAGE_MAX_AGE_MONTHS,
  JOB_EMBEDDING_AGE_FILTER_ENABLED: env.JOB_EMBEDDING_AGE_FILTER_ENABLED,
  JOB_EMBEDDING_MAX_AGE_MONTHS: env.JOB_EMBEDDING_MAX_AGE_MONTHS,
  JOB_UNKNOWN_DATE_POLICY: env.JOB_UNKNOWN_DATE_POLICY,
};

afterEach(() => {
  Object.assign(env, snapshot);
});

const now = () => new Date('2026-08-03T00:00:00.000Z');

describe('JobAgePolicy', () => {
  it('uses calendar-month cutoffs', () => {
    Object.assign(env, {
      JOB_STORAGE_AGE_FILTER_ENABLED: true,
      JOB_STORAGE_MAX_AGE_MONTHS: 3,
      JOB_EMBEDDING_AGE_FILTER_ENABLED: true,
      JOB_EMBEDDING_MAX_AGE_MONTHS: 2,
    });
    const policy = new JobAgePolicy(now);
    expect(policy.getStorageCutoffDate()).toEqual(new Date('2026-05-03T00:00:00.000Z'));
    expect(policy.getEmbeddingCutoffDate()).toEqual(new Date('2026-06-03T00:00:00.000Z'));
  });

  it('evaluates storage eligibility independently of embedding settings', () => {
    Object.assign(env, {
      JOB_STORAGE_AGE_FILTER_ENABLED: true,
      JOB_STORAGE_MAX_AGE_MONTHS: 3,
      JOB_EMBEDDING_AGE_FILTER_ENABLED: false,
      JOB_UNKNOWN_DATE_POLICY: 'ALLOW_STORAGE_ONLY',
    });
    const policy = new JobAgePolicy(now);

    expect(
      policy.evaluateStorageEligibility({
        effectiveDate: new Date('2026-05-03T00:00:00.000Z'),
      }).reason,
    ).toBe('WITHIN_STORAGE_AGE_WINDOW');

    expect(
      policy.evaluateStorageEligibility({
        effectiveDate: new Date('2026-05-02T23:59:59.000Z'),
      }).reason,
    ).toBe('OUTSIDE_STORAGE_AGE_WINDOW');

    expect(policy.evaluateStorageEligibility({ effectiveDate: null }).eligible).toBe(true);
  });

  it('requires storage eligibility before embedding eligibility', () => {
    Object.assign(env, {
      JOB_STORAGE_AGE_FILTER_ENABLED: true,
      JOB_STORAGE_MAX_AGE_MONTHS: 3,
      JOB_EMBEDDING_AGE_FILTER_ENABLED: true,
      JOB_EMBEDDING_MAX_AGE_MONTHS: 2,
      JOB_UNKNOWN_DATE_POLICY: 'ALLOW_STORAGE_ONLY',
    });
    const policy = new JobAgePolicy(now);

    expect(
      policy.evaluateEmbeddingEligibility({
        effectiveDate: new Date('2026-04-01T00:00:00.000Z'),
        isActive: true,
      }).reason,
    ).toBe('NOT_STORAGE_ELIGIBLE');

    expect(
      policy.evaluateEmbeddingEligibility({
        effectiveDate: new Date('2026-05-15T00:00:00.000Z'),
        isActive: true,
      }).reason,
    ).toBe('OUTSIDE_EMBEDDING_AGE_WINDOW');

    expect(
      policy.evaluateEmbeddingEligibility({
        effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
        isActive: true,
      }).reason,
    ).toBe('WITHIN_EMBEDDING_AGE_WINDOW');

    expect(
      policy.evaluateEmbeddingEligibility({
        effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
        isActive: false,
      }).reason,
    ).toBe('JOB_NOT_ACTIVE');

    expect(
      policy.evaluateEmbeddingEligibility({
        effectiveDate: null,
        isActive: true,
      }).eligible,
    ).toBe(false);
  });

  it('rejects missing dates when JOB_UNKNOWN_DATE_POLICY=REJECT', () => {
    Object.assign(env, {
      JOB_STORAGE_AGE_FILTER_ENABLED: true,
      JOB_EMBEDDING_AGE_FILTER_ENABLED: true,
      JOB_UNKNOWN_DATE_POLICY: 'REJECT',
    });
    const policy = new JobAgePolicy(now);
    expect(policy.evaluateStorageEligibility({ effectiveDate: null }).eligible).toBe(false);
    expect(policy.evaluateEmbeddingEligibility({ effectiveDate: null }).eligible).toBe(false);
  });
});
