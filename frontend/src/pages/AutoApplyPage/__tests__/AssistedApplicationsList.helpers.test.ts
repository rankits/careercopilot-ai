import { describe, expect, it } from 'vitest';

import { formatListRelativeTime } from '../assistedApplicationsListUtils';
import {
  labelForViewState,
  toAssistedApplyView,
} from '@/features/auto-apply/utils/assistedApplyView';
import type { JobApplicationDto } from '@/features/auto-apply/types/autoApply.types';

/** Pure helpers for AA-080 list labels — React suite deferred (see skipped-tests ledger). */
describe('AssistedApplicationsList helpers (AA-080)', () => {
  it('maps every product view state to a plain-language chip label (never raw enum)', () => {
    const statuses: JobApplicationDto['status'][] = [
      'DISCOVERED',
      'INFORMATION_REQUIRED',
      'NOT_ELIGIBLE',
      'READY_FOR_REVIEW',
      'ACTION_REQUIRED',
      'SUBMITTED',
      'WITHDRAWN',
      'QUEUED',
    ];
    for (const status of statuses) {
      const view = toAssistedApplyView(status);
      const label = labelForViewState(view);
      expect(label).not.toBe(status);
      expect(label).not.toMatch(/_/);
    }
    expect(labelForViewState('OPENED')).toBe('Application opened');
    expect(labelForViewState('APPLIED')).toBe('Marked as applied');
  });

  it('formats relative updated timestamps', () => {
    const now = new Date('2026-08-06T12:00:00Z');
    expect(formatListRelativeTime('2026-08-06T10:00:00Z', now)).toMatch(/hour/i);
  });
});
