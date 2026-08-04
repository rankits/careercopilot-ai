import { StuckSubmissionDto } from '@/modules/auto-apply/types/admin-diagnostics.types.js';

export interface StuckSubmissionsQuery {
  /** QUEUED/SUBMITTING rows idle longer than this likely mean a worker
   * crashed mid-processing or never picked up the message. */
  queueStalledAfterMinutes: number;
  /** ACTION_REQUIRED rows idle longer than this mean the user was handed
   * off to an external site and never came back to confirm. */
  awaitingConfirmationAfterDays: number;
}

export interface IAdminDiagnosticsRepository {
  /** Deliberately cross-user (admin-only) — every other repository in this
   * module scopes by `userId`; this is the one legitimate exception. */
  findStuckSubmissions(query: StuckSubmissionsQuery): Promise<StuckSubmissionDto[]>;
}

export interface IAdminDiagnosticsService {
  getStuckSubmissions(query?: Partial<StuckSubmissionsQuery>): Promise<StuckSubmissionDto[]>;
}
