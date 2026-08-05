import { JobApplicationStatus } from '@prisma/client';
import { AppError } from '@/shared/utils/errors/AppError.js';
import {
  IJobApplicationRepository,
  IJobApplicationService,
  InitiateJobApplicationResult,
} from '@/modules/auto-apply/contracts/job-application.contract.js';
import {
  IEligibilityService,
  IJobEligibilityLookup,
} from '@/modules/auto-apply/contracts/eligibility.contract.js';
import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';
import { isValidTransition } from '@/modules/auto-apply/utils/state-machine.util.js';
import {
  normalizeCompanyName,
  normalizeJobTitle,
} from '@/modules/auto-apply/utils/normalize.util.js';

export class JobApplicationService implements IJobApplicationService {
  constructor(
    private readonly repository: IJobApplicationRepository,
    private readonly eligibilityService: IEligibilityService,
    private readonly jobLookup: IJobEligibilityLookup,
  ) {}

  async listApplications(userId: string): Promise<JobApplicationDto[]> {
    return this.repository.findManyByUserId(userId);
  }

  async getApplication(userId: string, id: string): Promise<JobApplicationDto> {
    const application = await this.repository.findById(userId, id);
    if (!application) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }
    return application;
  }

  /**
   * Starts tracking a candidate job for auto-apply. Implements the
   * AJA-PROD-007 duplicate policy's three tiers:
   *  1. Exact (userId, jobId) — hard block (this check + the DB unique constraint).
   *  2. Canonical job id (Job.canonicalHash, cross-source) — hard block.
   *  3. Fuzzy company+title match — warning only, surfaced as
   *     `possibleDuplicates`, never blocks creation.
   */
  async initiate(userId: string, jobId: string): Promise<InitiateJobApplicationResult> {
    const job = await this.jobLookup.findJobSnapshot(jobId);
    if (!job) {
      throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    const existingByJobId = await this.repository.findByUserIdAndJobId(userId, jobId);
    if (existingByJobId) {
      if (existingByJobId.status === 'WITHDRAWN') {
        const application = await this.reopen(userId, existingByJobId.id);
        return { application, possibleDuplicates: [] };
      }
      throw new AppError(
        'An auto-apply submission already exists for this job.',
        409,
        'APPLICATION_EXISTS',
        { existingApplicationId: existingByJobId.id, status: existingByJobId.status },
      );
    }

    const existingByCanonicalId = await this.repository.findByUserIdAndCanonicalJobId(
      userId,
      job.canonicalJobId,
    );
    if (existingByCanonicalId) {
      if (existingByCanonicalId.status === 'WITHDRAWN') {
        const application = await this.reopen(userId, existingByCanonicalId.id);
        return { application, possibleDuplicates: [] };
      }
      throw new AppError(
        'An auto-apply submission already exists for this job (matched via a different listing of the same posting).',
        409,
        'APPLICATION_EXISTS',
        { existingApplicationId: existingByCanonicalId.id, status: existingByCanonicalId.status },
      );
    }

    const normalizedCompany = normalizeCompanyName(job.companySlug);
    const normalizedTitle = normalizeJobTitle(job.title);
    const others = await this.repository.findManyByUserId(userId);
    const possibleDuplicates = others.filter(
      (other) =>
        other.status !== 'WITHDRAWN' &&
        other.companySlug &&
        other.jobTitle &&
        normalizeCompanyName(other.companySlug) === normalizedCompany &&
        normalizeJobTitle(other.jobTitle) === normalizedTitle,
    );

    const application = await this.repository.create({
      userId,
      jobId,
      canonicalJobId: job.canonicalJobId,
      companySlug: job.companySlug,
      jobTitle: job.title,
    });

    return { application, possibleDuplicates };
  }

  /** Runs the hard eligibility engine for this submission's linked job and
   * records the result, moving status to MATCHED or NOT_ELIGIBLE. Never
   * substitutes recommendation match score for this check (AJA-RULE-001). */
  async evaluateEligibility(userId: string, id: string): Promise<JobApplicationDto> {
    const application = await this.getApplication(userId, id);
    if (!application.jobId) {
      throw new AppError(
        'This submission has no linked platform job to evaluate.',
        400,
        'JOB_LINK_REQUIRED',
      );
    }

    const result = await this.eligibilityService.evaluateForJob(userId, application.jobId);
    const nextStatus: JobApplicationStatus = result.eligible ? 'MATCHED' : 'NOT_ELIGIBLE';

    if (
      application.status !== nextStatus &&
      !isValidTransition(application.status as JobApplicationStatus, nextStatus)
    ) {
      throw new AppError(
        `Cannot record eligibility result: submission is already ${application.status}`,
        409,
        'INVALID_STATUS_TRANSITION',
      );
    }

    return this.repository.updateStatus(userId, id, {
      status: nextStatus,
      eligibilityResult: result,
    });
  }

  async transitionStatus(
    userId: string,
    id: string,
    toStatus: JobApplicationStatus,
  ): Promise<JobApplicationDto> {
    const application = await this.getApplication(userId, id);
    const from = application.status as JobApplicationStatus;

    if (from === toStatus) return application;

    if (!isValidTransition(from, toStatus)) {
      throw new AppError(
        `Cannot transition submission from ${from} to ${toStatus}`,
        409,
        'INVALID_STATUS_TRANSITION',
      );
    }

    return this.repository.updateStatus(userId, id, { status: toStatus });
  }

  async withdraw(userId: string, id: string): Promise<JobApplicationDto> {
    return this.transitionStatus(userId, id, 'WITHDRAWN');
  }

  async delete(userId: string, id: string): Promise<boolean> {
    return this.repository.delete(userId, id);
  }

  async reopen(userId: string, id: string): Promise<JobApplicationDto> {
    return this.repository.reopenFromWithdrawn(userId, id);
  }
}
