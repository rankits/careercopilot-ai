import { describe, expect, it } from 'vitest';

import {
  canRepairLegacyStatus,
  planLegacyStatusRepairs,
} from '@/modules/auto-apply/utils/legacy-status-repair.util.js';

describe('legacy-status-repair.util (AA-093)', () => {
  it('allows APPROVED and QUEUED → WITHDRAWN via state machine', () => {
    expect(canRepairLegacyStatus('APPROVED')).toBe(true);
    expect(canRepairLegacyStatus('QUEUED')).toBe(true);
    expect(canRepairLegacyStatus('SUBMITTED')).toBe(false);
  });

  it('dry-run plan marks only eligible rows', () => {
    const plan = planLegacyStatusRepairs([
      { id: '1', userId: 'u1', status: 'APPROVED' },
      { id: '2', userId: 'u2', status: 'QUEUED' },
      { id: '3', userId: 'u3', status: 'SUBMITTED' },
    ]);
    expect(plan.filter((r) => r.eligible)).toHaveLength(2);
    expect(plan.find((r) => r.id === '3')?.eligible).toBe(false);
  });

  it('is idempotent for already WITHDRAWN rows (not eligible)', () => {
    const plan = planLegacyStatusRepairs([{ id: '1', userId: 'u1', status: 'WITHDRAWN' }]);
    expect(plan[0]?.eligible).toBe(false);
  });
});
