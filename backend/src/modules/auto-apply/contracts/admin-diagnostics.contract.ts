import {
  ReclaimStuckResult,
  StuckSubmissionDto,
  StuckSubmittingCandidate,
} from '@/modules/auto-apply/types/admin-diagnostics.types.js';

export interface StuckSubmissionsQuery {
  /** QUEUED/SUBMITTING rows idle longer than this likely mean a worker
   * crashed mid-processing or never picked up the message. */
  queueStalledAfterMinutes: number;
  /** ACTION_REQUIRED rows idle longer than this mean the user was handed
   * off to an external site and never came back to confirm. */
  awaitingConfirmationAfterDays: number;
}

export interface ReclaimStuckQuery {
  submittingOlderThanMinutes: number;
}

export interface IAdminDiagnosticsRepository {
  /** Deliberately cross-user (admin-only) — every other repository in this
   * module scopes by `userId`; this is the one legitimate exception. */
  findStuckSubmissions(query: StuckSubmissionsQuery): Promise<StuckSubmissionDto[]>;

  /** SUBMITTING rows whose `updatedAt` is older than `cutoff`. */
  findSubmittingOlderThan(cutoff: Date): Promise<StuckSubmittingCandidate[]>;

  /**
   * CAS: only reclaim if the row is still SUBMITTING and still older than
   * `cutoff`. Returns null when a live worker already finalized (or the row
   * is no longer eligible).
   */
  reclaimSubmittingIfStuck(
    id: string,
    cutoff: Date,
    failureCode: string,
    failureMessage: string,
  ): Promise<StuckSubmittingCandidate | null>;
}

export interface IAdminDiagnosticsService {
  getStuckSubmissions(query?: Partial<StuckSubmissionsQuery>): Promise<StuckSubmissionDto[]>;
  reclaimStuckSubmissions(query?: Partial<ReclaimStuckQuery>): Promise<ReclaimStuckResult>;
}
