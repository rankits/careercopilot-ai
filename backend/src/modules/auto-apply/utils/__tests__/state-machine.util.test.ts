import { describe, expect, it } from 'vitest';
import {
  getAllowedTransitions,
  isValidTransition,
} from '@/modules/auto-apply/utils/state-machine.util.js';

describe('auto-apply job application state machine', () => {
  it('allows DISCOVERED to move to MATCHED, NOT_ELIGIBLE, or WITHDRAWN', () => {
    expect(isValidTransition('DISCOVERED', 'MATCHED')).toBe(true);
    expect(isValidTransition('DISCOVERED', 'NOT_ELIGIBLE')).toBe(true);
    expect(isValidTransition('DISCOVERED', 'WITHDRAWN')).toBe(true);
  });

  it('rejects skipping straight from DISCOVERED to SUBMITTED', () => {
    expect(isValidTransition('DISCOVERED', 'SUBMITTED')).toBe(false);
  });

  it('never allows a blind retry from SUBMISSION_OUTCOME_UNKNOWN-shaped terminal states', () => {
    // CONFIRMATION_RECEIVED and WITHDRAWN are terminal — no outbound edges.
    expect(getAllowedTransitions('CONFIRMATION_RECEIVED')).toEqual([]);
    expect(getAllowedTransitions('WITHDRAWN')).toEqual([]);
  });

  it('only allows SUBMISSION_FAILED to move back to QUEUED (safe-to-retry path)', () => {
    expect(getAllowedTransitions('SUBMISSION_FAILED')).toEqual(['QUEUED']);
  });

  it('allows re-checking eligibility from NOT_ELIGIBLE back to MATCHED', () => {
    expect(isValidTransition('NOT_ELIGIBLE', 'MATCHED')).toBe(true);
  });

  it('rejects an unknown/reversed transition such as APPROVED back to READY_FOR_REVIEW', () => {
    expect(isValidTransition('APPROVED', 'READY_FOR_REVIEW')).toBe(false);
  });
});
