import { describe, expect, it } from 'vitest';
import {
  computeWorkspaceSteps,
  isWorkspaceStepEnabled,
  resolveInitialWorkspaceStep,
} from '@/modules/auto-apply/utils/assisted-apply-workspace.util.js';
import type { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';

const baseApp = {
  id: 'ja-1',
  userId: 'u-1',
  jobId: 'job-1',
  normalisedJobUrl: null,
  canonicalJobId: 'c-1',
  companySlug: 'acme',
  jobTitle: 'Engineer',
  channel: 'EXTERNAL_MANUAL',
  status: 'DISCOVERED',
  approvalMode: 'PER_APPLICATION',
  matchScore: null,
  eligibilityResult: null,
  resumeVersionId: null,
  coverLetterContent: null,
  consentId: null,
  approvedAt: null,
  queuedAt: null,
  submittedAt: null,
  externalApplicationId: null,
  externalConfirmationUrl: null,
  failureCode: null,
  failureMessage: null,
  planInputsHash: null,
  planVersion: 1,
  progressStep: null,
  reopenedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as JobApplicationDto;

describe('assisted-apply workspace util (AA-040/AA-043)', () => {
  it('enables steps up to the first incomplete one', () => {
    const steps = computeWorkspaceSteps({ hasAnalysis: true, application: baseApp });
    expect(isWorkspaceStepEnabled(steps, 'analysis')).toBe(true);
    expect(isWorkspaceStepEnabled(steps, 'fit')).toBe(true);
    expect(isWorkspaceStepEnabled(steps, 'resume')).toBe(true);
    expect(isWorkspaceStepEnabled(steps, 'open')).toBe(false);
  });

  it('prefers explicit ?step= over progressStep when still valid', () => {
    const steps = computeWorkspaceSteps({
      hasAnalysis: true,
      application: { ...baseApp, resumeVersionId: 'rv-1', matchScore: 0.8 },
    });
    expect(
      resolveInitialWorkspaceStep({
        steps,
        explicitStep: 'fit',
        progressStep: 'open',
      }),
    ).toBe('fit');
  });

  it('falls back from stale progressStep to first incomplete', () => {
    const steps = computeWorkspaceSteps({ hasAnalysis: false, application: baseApp });
    expect(
      resolveInitialWorkspaceStep({
        steps,
        explicitStep: null,
        progressStep: 'open',
      }),
    ).toBe('analysis');
  });
});
