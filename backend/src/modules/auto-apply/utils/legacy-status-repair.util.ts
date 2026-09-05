import { isValidTransition } from '@/modules/auto-apply/utils/state-machine.util.js';
import type { JobApplicationStatusValue } from '@/modules/auto-apply/types/job-application.types.js';

/** Legacy queue-era statuses repaired by AA-093 → WITHDRAWN. */
export const LEGACY_REPAIR_SOURCE_STATUSES: JobApplicationStatusValue[] = ['APPROVED', 'QUEUED'];

export const LEGACY_REPAIR_TARGET: JobApplicationStatusValue = 'WITHDRAWN';

export interface LegacyRepairCandidate {
  id: string;
  userId: string;
  status: JobApplicationStatusValue;
}

export interface LegacyRepairPlanRow {
  id: string;
  userId: string;
  previousStatus: JobApplicationStatusValue;
  newStatus: JobApplicationStatusValue;
  eligible: boolean;
  skipReason?: string;
}

export function canRepairLegacyStatus(status: JobApplicationStatusValue): boolean {
  if (!LEGACY_REPAIR_SOURCE_STATUSES.includes(status)) return false;
  return isValidTransition(status, LEGACY_REPAIR_TARGET);
}

export function planLegacyStatusRepairs(rows: LegacyRepairCandidate[]): LegacyRepairPlanRow[] {
  return rows.map((row) => {
    if (!LEGACY_REPAIR_SOURCE_STATUSES.includes(row.status)) {
      return {
        id: row.id,
        userId: row.userId,
        previousStatus: row.status,
        newStatus: LEGACY_REPAIR_TARGET,
        eligible: false,
        skipReason: `status ${row.status} is not a legacy repair target`,
      };
    }
    if (!isValidTransition(row.status, LEGACY_REPAIR_TARGET)) {
      return {
        id: row.id,
        userId: row.userId,
        previousStatus: row.status,
        newStatus: LEGACY_REPAIR_TARGET,
        eligible: false,
        skipReason: `state machine forbids ${row.status} → ${LEGACY_REPAIR_TARGET}`,
      };
    }
    return {
      id: row.id,
      userId: row.userId,
      previousStatus: row.status,
      newStatus: LEGACY_REPAIR_TARGET,
      eligible: true,
    };
  });
}
