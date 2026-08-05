import {
  IAdminDiagnosticsRepository,
  IAdminDiagnosticsService,
  ReclaimStuckQuery,
  StuckSubmissionsQuery,
} from '@/modules/auto-apply/contracts/admin-diagnostics.contract.js';
import { ISubmissionAttemptRepository } from '@/modules/auto-apply/contracts/submission-attempt.contract.js';
import { IAutoApplyEventService } from '@/modules/auto-apply/contracts/audit-event.contract.js';
import {
  ReclaimStuckResult,
  StuckSubmissionDto,
} from '@/modules/auto-apply/types/admin-diagnostics.types.js';
import { logger } from '@/shared/logger/logger.js';

const DEFAULT_QUERY: StuckSubmissionsQuery = {
  queueStalledAfterMinutes: 15,
  awaitingConfirmationAfterDays: 7,
};

const DEFAULT_RECLAIM_MINUTES = 15;
const STUCK_TIMEOUT_CODE = 'STUCK_TIMEOUT';
const STUCK_TIMEOUT_MESSAGE =
  'Submission timed out while processing and was reclaimed by an operator.';

/** Implements AJA-OBS-002 + AA-007 reclaim. Cross-user by design — this is the one
 * legitimate admin-only exception to the "own"-scoped pattern every other
 * auto-apply resource follows. */
export class AdminDiagnosticsService implements IAdminDiagnosticsService {
  constructor(
    private readonly repository: IAdminDiagnosticsRepository,
    private readonly submissionAttemptRepository: ISubmissionAttemptRepository,
    private readonly eventService: IAutoApplyEventService,
  ) {}

  async getStuckSubmissions(query?: Partial<StuckSubmissionsQuery>): Promise<StuckSubmissionDto[]> {
    // Per-field `??` rather than object-spread merging — the controller
    // always passes both keys (possibly `undefined` when the query param
    // was omitted), and `{...DEFAULT_QUERY, ...query}` would let an
    // explicit `undefined` silently overwrite a real default instead of
    // falling back to it.
    const merged: StuckSubmissionsQuery = {
      queueStalledAfterMinutes:
        query?.queueStalledAfterMinutes ?? DEFAULT_QUERY.queueStalledAfterMinutes,
      awaitingConfirmationAfterDays:
        query?.awaitingConfirmationAfterDays ?? DEFAULT_QUERY.awaitingConfirmationAfterDays,
    };
    return this.repository.findStuckSubmissions(merged);
  }

  async reclaimStuckSubmissions(
    query?: Partial<ReclaimStuckQuery>,
  ): Promise<ReclaimStuckResult> {
    const submittingOlderThanMinutes =
      query?.submittingOlderThanMinutes ?? DEFAULT_RECLAIM_MINUTES;
    const now = Date.now();
    const cutoff = new Date(now - submittingOlderThanMinutes * 60_000);

    const candidates = await this.repository.findSubmittingOlderThan(cutoff);
    const jobApplicationIds: string[] = [];

    for (const candidate of candidates) {
      try {
        const reclaimed = await this.reclaimOne(candidate, cutoff, now);
        if (reclaimed) {
          jobApplicationIds.push(reclaimed);
        }
      } catch (error) {
        logger.error(
          { err: error, jobApplicationId: candidate.id },
          'Failed to reclaim stuck SUBMITTING application — continuing with remaining rows',
        );
      }
    }

    return { reclaimed: jobApplicationIds.length, jobApplicationIds };
  }

  /**
   * CAS status update first (so a racing live finalize wins cleanly), then
   * attempt row + audit. Attempt numbering mirrors AA-005 (`count + 1` with
   * one P2002 retry).
   */
  private async reclaimOne(
    candidate: { id: string; userId: string; updatedAt: Date },
    cutoff: Date,
    nowMs: number,
  ): Promise<string | null> {
    const claimed = await this.repository.reclaimSubmittingIfStuck(
      candidate.id,
      cutoff,
      STUCK_TIMEOUT_CODE,
      STUCK_TIMEOUT_MESSAGE,
    );
    if (!claimed) {
      return null;
    }

    const attemptNumber = await this.createAttemptWithUniqueRetry(candidate.id);
    // Use the pre-reclaim `updatedAt` — Prisma bumps `updatedAt` on the CAS write.
    const staleForMinutes = Math.round((nowMs - candidate.updatedAt.getTime()) / 60_000);

    await this.eventService.record({
      userId: claimed.userId,
      eventType: 'SUBMISSION_RECLAIMED',
      jobApplicationId: candidate.id,
      metadata: {
        attemptNumber,
        failureCode: STUCK_TIMEOUT_CODE,
        staleForMinutes,
      },
    });

    logger.info(
      { jobApplicationId: candidate.id, attemptNumber, staleForMinutes },
      'Reclaimed stuck SUBMITTING application',
    );

    return candidate.id;
  }

  private async createAttemptWithUniqueRetry(jobApplicationId: string): Promise<number> {
    let attemptNumber =
      (await this.submissionAttemptRepository.countByJobApplicationId(jobApplicationId)) + 1;
    try {
      await this.submissionAttemptRepository.create({
        jobApplicationId,
        attemptNumber,
        outcome: 'FAILED_DO_NOT_RETRY',
        errorCode: STUCK_TIMEOUT_CODE,
        errorMessage: STUCK_TIMEOUT_MESSAGE,
      });
      return attemptNumber;
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') {
        throw error;
      }
      attemptNumber =
        (await this.submissionAttemptRepository.countByJobApplicationId(jobApplicationId)) + 1;
      await this.submissionAttemptRepository.create({
        jobApplicationId,
        attemptNumber,
        outcome: 'FAILED_DO_NOT_RETRY',
        errorCode: STUCK_TIMEOUT_CODE,
        errorMessage: STUCK_TIMEOUT_MESSAGE,
      });
      return attemptNumber;
    }
  }
}
