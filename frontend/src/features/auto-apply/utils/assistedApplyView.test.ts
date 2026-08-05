import { describe, expect, it, vi } from 'vitest';

import type { JobApplicationDto } from '../types/autoApply.types';

import type {
  AssistedApplyViewState
} from './assistedApplyView';
import {
  toAssistedApplyView,
  labelForViewState,
  tooltipForViewState
} from './assistedApplyView';


describe('assistedApplyView', () => {
  const exhaustiveMatrix: Record<JobApplicationDto['status'], AssistedApplyViewState> = {
    DISCOVERED: 'TRACKED',
    MATCHED: 'TRACKED',
    APPLICATION_PLANNING: 'TRACKED',
    INFORMATION_REQUIRED: 'NEEDS_INFO',
    NOT_ELIGIBLE: 'BLOCKED',
    READY_FOR_REVIEW: 'READY_TO_OPEN',
    ACTION_REQUIRED: 'OPENED',
    SUBMITTED: 'APPLIED',
    CONFIRMATION_RECEIVED: 'APPLIED',
    WITHDRAWN: 'ABANDONED',
    APPROVED: 'LEGACY_ATTENTION',
    QUEUED: 'LEGACY_ATTENTION',
    SUBMITTING: 'LEGACY_ATTENTION',
    SUBMISSION_FAILED: 'LEGACY_ATTENTION',
    READY_FOR_AUTOPILOT: 'LEGACY_ATTENTION',
  };

  it('exhaustively maps all known JobApplicationStatus values', () => {
    Object.entries(exhaustiveMatrix).forEach(([status, expectedState]) => {
      expect(toAssistedApplyView(status as JobApplicationDto['status'])).toBe(expectedState);
    });
  });

  it('falls back to LEGACY_ATTENTION for unknown status and logs error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(toAssistedApplyView('SOME_FUTURE_STATUS' as JobApplicationDto['status'])).toBe('LEGACY_ATTENTION');
    expect(errorSpy).toHaveBeenCalledWith('Unknown JobApplicationStatus: SOME_FUTURE_STATUS');
    errorSpy.mockRestore();
  });

  it('never outputs forbidden substrings for any known state', () => {
    const forbiddenSubstrings = ['QUEUED', 'SUBMITTING', 'Approve', 'Submission queued'];
    const allStates: AssistedApplyViewState[] = [
      'TRACKED', 'NEEDS_INFO', 'BLOCKED', 'READY_TO_OPEN',
      'OPENED', 'APPLIED', 'ABANDONED', 'LEGACY_ATTENTION'
    ];

    allStates.forEach((state) => {
      const label = labelForViewState(state);
      const tooltip = tooltipForViewState(state) || '';
      
      forbiddenSubstrings.forEach(forbidden => {
        expect(label.toLowerCase()).not.toContain(forbidden.toLowerCase());
        expect(tooltip.toLowerCase()).not.toContain(forbidden.toLowerCase());
      });
    });
  });

  it('provides the correct tooltip only for LEGACY_ATTENTION', () => {
    expect(tooltipForViewState('LEGACY_ATTENTION')).toBe('This application was left in an older processing state. You can abandon it and start Assisted Apply again.');
    expect(tooltipForViewState('TRACKED')).toBeUndefined();
  });
});
