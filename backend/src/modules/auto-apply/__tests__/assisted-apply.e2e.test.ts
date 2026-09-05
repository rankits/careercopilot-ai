import { ApplicationReadinessService } from '@/modules/auto-apply/services/application-readiness.service.js';
import { JobApplicationAdapterRegistry } from '@/modules/auto-apply/adapters/adapter-registry.js';
import { ExternalRedirectAdapter } from '@/modules/auto-apply/adapters/external-redirect.adapter.js';
import { AutoApplyEventService } from '@/modules/auto-apply/services/audit-event.service.js';
import { SubmissionOrchestrationService } from '@/modules/auto-apply/services/submission-orchestration.service.js';
import { SubmissionProcessingService } from '@/modules/auto-apply/services/submission-processing.service.js';
import { ApplicationPlannerService } from '@/modules/auto-apply/services/application-planner.service.js';
import { EligibilityService } from '@/modules/auto-apply/services/eligibility.service.js';
import { ChannelDetectionService } from '@/modules/auto-apply/services/channel-detection.service.js';
import { JobApplicationService } from '@/modules/auto-apply/services/job-application.service.js';
import { ISubmissionQueuePort } from '@/modules/auto-apply/contracts/submission-orchestration.contract.js';
import { IAutoApplyEventRepository } from '@/modules/auto-apply/contracts/audit-event.contract.js';
import {
  CreateSubmissionAttemptData,
  ISubmissionAttemptRepository,
} from '@/modules/auto-apply/contracts/submission-attempt.contract.js';
import { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import { IApplicationAnswerRepository } from '@/modules/auto-apply/contracts/application-answer.contract.js';
import { IApprovedResumeVersionRepository } from '@/modules/auto-apply/contracts/resume-version.contract.js';
import { IApplicationRuleRepository } from '@/modules/auto-apply/contracts/application-rule.contract.js';
import { ICandidateApplicationProfileRepository } from '@/modules/auto-apply/contracts/candidate-profile.contract.js';
import {
  CreateJobApplicationData,
  FinalizeSubmissionData,
  IJobApplicationRepository,
  UpdateJobApplicationStatusData,
  UpdatePlanData,
} from '@/modules/auto-apply/contracts/job-application.contract.js';
import {
  IChannelDetectionJobLookup,
  JobChannelSnapshot,
} from '@/modules/auto-apply/contracts/channel-detection.contract.js';
import {
  IJobEligibilityLookup,
  JobEligibilitySnapshot,
} from '@/modules/auto-apply/contracts/eligibility.contract.js';
import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';
import { CandidateApplicationProfileDto } from '@/modules/auto-apply/types/candidate-profile.types.js';
import { ApprovedResumeVersionDto } from '@/modules/auto-apply/types/resume-version.types.js';
import { ApplicationAnswerDto } from '@/modules/auto-apply/types/application-answer.types.js';
import {
  ApplicationConsentDto,
  ConsentTypeValue,
} from '@/modules/auto-apply/types/application-consent.types.js';
import { ApplicationSubmissionAttemptDto } from '@/modules/auto-apply/types/submission-attempt.types.js';
import {
  AutoApplyAuditEventDto,
  RecordAuditEventData,
} from '@/modules/auto-apply/types/audit-event.types.js';
import { randomUUID } from 'node:crypto';
import { describe, expect, it, beforeEach } from 'vitest';

/**
 * AJA-QA-002 — true end-to-end happy path for the Assisted-Apply flow
 * (EXTERNAL_MANUAL channel), start to finish: initiate -> eligibility ->
 * plan -> consent-gated approval -> queue -> worker submission -> user
 * confirmation. Every other auto-apply test either exercises one service
 * against mocked repository calls in isolation, or hits the real HTTP app
 * with the *service* mocked out (see `__tests__/*.security.api.test.ts`) -
 * neither proves the real services actually hand off to each other
 * correctly across the full lifecycle. This file wires the real service
 * classes together (exactly as `controllers/*.controller.ts` does in
 * production) against small stateful in-memory repository fakes, so the
 * orchestration itself - not just each unit in isolation - is verified.
 *
 * The Email-Apply flow from this ticket's own description is deliberately
 * NOT covered here: `ChannelDetectionService` can only ever return
 * `EXTERNAL_MANUAL` or `UNSUPPORTED` today (see its own file-level comment)
 * because email-channel classification depends on Gmail OAuth
 * (`AJA-EMAIL-001`), which is on hold pending real credentials - an
 * external dependency, not something this pass can complete. Writing an
 * e2e test for a flow with no reachable code path would just be theater.
 */

class FakeJobApplicationRepository implements IJobApplicationRepository {
  rows: JobApplicationDto[] = [];

  // Every accessor returns a fresh shallow copy, never the live row - this
  // mirrors real Prisma's snapshot-per-query semantics (see
  // `PrismaJobApplicationRepository#toDto`), which matters here because
  // several steps in this e2e flow hold onto a returned DTO across an
  // `await` boundary while a later step mutates the underlying row; a
  // shared mutable reference would make earlier snapshots "change after
  // the fact", which is not how the real repository behaves.
  private copy(record: JobApplicationDto): JobApplicationDto {
    return { ...record };
  }

  async findManyByUserId(userId: string) {
    return this.rows.filter((r) => r.userId === userId).map((r) => this.copy(r));
  }
  async findById(userId: string, id: string) {
    const record = this.rows.find((r) => r.userId === userId && r.id === id);
    return record ? this.copy(record) : null;
  }
  async findByUserIdAndJobId(userId: string, jobId: string) {
    const record = this.rows.find((r) => r.userId === userId && r.jobId === jobId);
    return record ? this.copy(record) : null;
  }
  async findByUserIdAndCanonicalJobId(userId: string, canonicalJobId: string) {
    const record = this.rows.find(
      (r) => r.userId === userId && r.canonicalJobId === canonicalJobId && r.status !== 'WITHDRAWN',
    );
    return record ? this.copy(record) : null;
  }
  async create(data: CreateJobApplicationData) {
    const now = new Date();
    const record: JobApplicationDto = {
      id: randomUUID(),
      userId: data.userId,
      jobId: data.jobId,
      normalisedJobUrl: null,
      canonicalJobId: data.canonicalJobId,
      companySlug: data.companySlug,
      jobTitle: data.jobTitle,
      channel: 'UNSUPPORTED',
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
      handoffOpenedAt: null,
      appliedNotes: null,
      abandonReason: null,
      abandonNote: null,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(record);
    return this.copy(record);
  }
  private findLiveRow(userId: string, id: string): JobApplicationDto {
    const record = this.rows.find((r) => r.userId === userId && r.id === id);
    if (!record) throw new Error('not found');
    return record;
  }
  async updateStatus(
    userId: string,
    id: string,
    data: UpdateJobApplicationStatusData,
    expectedStatus: string,
  ) {
    const record = this.findLiveRow(userId, id);
    if (record.status !== expectedStatus) {
      const err = new Error(
        'This application was already updated. Refresh to see its current state.',
      ) as Error & { statusCode: number; code: string };
      err.statusCode = 409;
      err.code = 'INVALID_STATUS_TRANSITION';
      throw err;
    }
    record.status = data.status;
    if (data.eligibilityResult !== undefined) record.eligibilityResult = data.eligibilityResult;
    record.updatedAt = new Date();
    return this.copy(record);
  }
  async updatePlan(userId: string, id: string, data: UpdatePlanData) {
    const record = this.findLiveRow(userId, id);
    if (record.planInputsHash !== data.planInputsHash) record.planVersion += 1;
    record.channel = data.channel;
    record.resumeVersionId = data.resumeVersionId;
    record.planInputsHash = data.planInputsHash;
    record.updatedAt = new Date();
    return this.copy(record);
  }
  async claimForSubmission(userId: string, id: string) {
    const record = this.findLiveRow(userId, id);
    if (record.status !== 'QUEUED') return null;
    record.status = 'SUBMITTING';
    return this.copy(record);
  }
  async finalizeSubmission(
    userId: string,
    id: string,
    data: FinalizeSubmissionData,
    expectedStatus: string,
  ) {
    const record = this.findLiveRow(userId, id);
    if (record.status !== expectedStatus) {
      const err = new Error(
        'This application was already updated. Refresh to see its current state.',
      ) as Error & { statusCode: number; code: string };
      err.statusCode = 409;
      err.code = 'INVALID_STATUS_TRANSITION';
      throw err;
    }
    record.status = data.status;
    if (data.externalApplicationId !== undefined)
      record.externalApplicationId = data.externalApplicationId;
    if (data.externalConfirmationUrl !== undefined)
      record.externalConfirmationUrl = data.externalConfirmationUrl;
    if (data.failureCode !== undefined) record.failureCode = data.failureCode;
    if (data.failureMessage !== undefined) record.failureMessage = data.failureMessage;
    if (data.markSubmittedNow) record.submittedAt = new Date();
    record.updatedAt = new Date();
    return this.copy(record);
  }
  async countConsumedSince(userId: string, _since: Date) {
    return this.rows.filter(
      (r) =>
        r.userId === userId &&
        ['QUEUED', 'SUBMITTING', 'SUBMITTED', 'CONFIRMATION_RECEIVED', 'ACTION_REQUIRED'].includes(
          r.status,
        ),
    ).length;
  }
  async updateMatchScore(userId: string, id: string, matchScore: number) {
    const record = this.findLiveRow(userId, id);
    record.matchScore = matchScore;
    return this.copy(record);
  }
  async queueAtomically(userId: string, id: string) {
    const record = this.findLiveRow(userId, id);
    if (record.status !== 'APPROVED' && record.status !== 'SUBMISSION_FAILED') {
      throw Object.assign(new Error('invalid'), {
        code: 'INVALID_STATUS_TRANSITION',
        statusCode: 409,
      });
    }
    record.status = 'QUEUED';
    record.queuedAt = new Date();
    return this.copy(record);
  }
  async delete(userId: string, id: string) {
    const index = this.rows.findIndex((r) => r.userId === userId && r.id === id);
    if (index < 0) {
      throw Object.assign(new Error('not found'), {
        code: 'APPLICATION_NOT_FOUND',
        statusCode: 404,
      });
    }
    this.rows.splice(index, 1);
    return true;
  }
  async reopenFromWithdrawn(userId: string, id: string) {
    const record = this.findLiveRow(userId, id);
    if (record.status !== 'WITHDRAWN') {
      throw Object.assign(new Error('invalid'), {
        code: 'INVALID_STATUS_TRANSITION',
        statusCode: 409,
      });
    }
    record.status = 'DISCOVERED';
    record.planVersion += 1;
    record.reopenedAt = new Date();
    record.progressStep = null;
    record.updatedAt = new Date();
    return this.copy(record);
  }
  async updateProgressStep(userId: string, id: string, progressStep: string) {
    const record = this.findLiveRow(userId, id);
    record.progressStep = progressStep;
    record.updatedAt = new Date();
    return this.copy(record);
  }

  async updateResumeSelection(userId: string, id: string, resumeVersionId: string) {
    const record = this.findLiveProp(userId, id);
    record.resumeVersionId = resumeVersionId;
    record.updatedAt = new Date();
    return this.copy(record);
  }
  async recordHandoffOpened(
    userId: string,
    id: string,
    data: { applyUrl: string; openedAt: Date },
    expectedStatus: string,
  ) {
    const record = this.findLiveProp(userId, id);
    if (record.status !== expectedStatus) return null;
    record.status = 'ACTION_REQUIRED';
    record.handoffOpenedAt = data.openedAt;
    record.externalConfirmationUrl = data.applyUrl;
    record.progressStep = 'open';
    record.updatedAt = new Date();
    return this.copy(record);
  }

  async markApplied(userId, id, data, expectedStatus) {
    const record = this.findLiveProp(userId, id);
    if (record.status !== expectedStatus) return null;
    record.status = 'SUBMITTED';
    record.submittedAt = data.submittedAt;
    record.appliedNotes = data.appliedNotes;
    record.progressStep = 'done';
    record.updatedAt = new Date();
    return this.copy(record);
  }
  async abandonApplication(userId, id, data, expectedStatus) {
    const record = this.findLiveProp(userId, id);
    if (record.status !== expectedStatus) return null;
    record.status = 'WITHDRAWN';
    record.abandonReason = data.abandonReason;
    record.abandonNote = data.abandonNote;
    record.updatedAt = new Date();
    return this.copy(record);
  }
  async updateAppliedDetails(userId, id, data) {
    const record = this.findLiveProp(userId, id);
    if (data.submittedAt) record.submittedAt = data.submittedAt;
    if (data.appliedNotes !== undefined) record.appliedNotes = data.appliedNotes;
    record.updatedAt = new Date();
    return this.copy(record);
  }
}

class FakeConsentRepository implements IApplicationConsentRepository {
  rows: ApplicationConsentDto[] = [];

  async findManyByUserId(userId: string) {
    return this.rows.filter((r) => r.userId === userId);
  }
  async findActiveByType(userId: string, consentType: ConsentTypeValue) {
    return (
      this.rows.find((r) => r.userId === userId && r.consentType === consentType && !r.revokedAt) ??
      null
    );
  }
  async findById(userId: string, id: string) {
    return this.rows.find((r) => r.userId === userId && r.id === id) ?? null;
  }
  async grant(userId: string, consentType: ConsentTypeValue) {
    const record: ApplicationConsentDto = {
      id: randomUUID(),
      userId,
      consentType,
      version: 1,
      grantedAt: new Date(),
      revokedAt: null,
    };
    this.rows.push(record);
    return record;
  }
  async revoke(userId: string, id: string) {
    const record = this.rows.find((r) => r.userId === userId && r.id === id);
    if (!record) throw new Error('not found');
    record.revokedAt = new Date();
    return record;
  }
}

class FakeSubmissionAttemptRepository implements ISubmissionAttemptRepository {
  rows: ApplicationSubmissionAttemptDto[] = [];

  async countByJobApplicationId(jobApplicationId: string) {
    return this.rows.filter((r) => r.jobApplicationId === jobApplicationId).length;
  }
  async create(data: CreateSubmissionAttemptData) {
    const record: ApplicationSubmissionAttemptDto = {
      id: randomUUID(),
      jobApplicationId: data.jobApplicationId,
      attemptNumber: data.attemptNumber,
      outcome: data.outcome,
      errorCode: data.errorCode ?? null,
      errorMessage: data.errorMessage ?? null,
      startedAt: new Date(),
      completedAt: new Date(),
    };
    this.rows.push(record);
    return record;
  }
  async findLatest(jobApplicationId: string) {
    const matches = this.rows.filter((r) => r.jobApplicationId === jobApplicationId);
    return matches[matches.length - 1] ?? null;
  }
}

class FakeAutoApplyEventRepository implements IAutoApplyEventRepository {
  rows: AutoApplyAuditEventDto[] = [];

  async record(data: RecordAuditEventData) {
    const record: AutoApplyAuditEventDto = {
      id: randomUUID(),
      userId: data.userId,
      jobApplicationId: data.jobApplicationId ?? null,
      eventType: data.eventType,
      metadata: data.metadata ?? {},
      createdAt: new Date(),
    };
    this.rows.push(record);
    return record;
  }
  async findManyByUserId(userId: string, limit: number) {
    return this.rows.filter((r) => r.userId === userId).slice(0, limit);
  }
}

/** Runs the worker synchronously in-test instead of round-tripping through
 * RabbitMQ - proves the orchestration -> queue -> worker hand-off wires the
 * right payload through without needing a live broker. */
class InlineWorkerQueuePort implements ISubmissionQueuePort {
  constructor(private readonly processor: SubmissionProcessingService) {}
  lastPayload: { jobApplicationId: string; userId: string } | null = null;

  async enqueue(payload: { jobApplicationId: string; userId: string }) {
    this.lastPayload = payload;
    await this.processor.processJob(payload);
  }
}

describe('Assisted-Apply (EXTERNAL_MANUAL) end-to-end happy path — AJA-QA-002', () => {
  const USER_ID = 'user-e2e-1';
  const JOB_ID = 'job-e2e-1';

  let jobAppRepo: FakeJobApplicationRepository;
  let consentRepo: FakeConsentRepository;
  let attemptRepo: FakeSubmissionAttemptRepository;
  let eventRepo: FakeAutoApplyEventRepository;

  let profileRepo: ICandidateApplicationProfileRepository;
  let ruleRepo: IApplicationRuleRepository;
  let resumeVersionRepo: IApprovedResumeVersionRepository;
  let answerRepo: IApplicationAnswerRepository;

  let jobEligibilityLookup: IJobEligibilityLookup;
  let jobChannelLookup: IChannelDetectionJobLookup;

  let jobApplicationService: JobApplicationService;
  let plannerService: ApplicationPlannerService;
  let orchestrationService: SubmissionOrchestrationService;
  let queuePort: InlineWorkerQueuePort;

  beforeEach(() => {
    jobAppRepo = new FakeJobApplicationRepository();
    consentRepo = new FakeConsentRepository();
    attemptRepo = new FakeSubmissionAttemptRepository();
    eventRepo = new FakeAutoApplyEventRepository();

    const jobSnapshot: JobEligibilitySnapshot & JobChannelSnapshot = {
      id: JOB_ID,
      title: 'Senior Backend Engineer',
      companySlug: 'acme',
      remoteType: null,
      salaryMax: null,
      status: 'ACTIVE',
      sourceProviders: ['GREENHOUSE'],
      canonicalJobId: 'canonical-hash-e2e-1',
      applyUrl: 'https://acme.example.com/careers/apply/123',
    };
    jobEligibilityLookup = { findJobSnapshot: async () => jobSnapshot };
    jobChannelLookup = { findJobChannelSnapshot: async () => jobSnapshot };

    const profile: CandidateApplicationProfileDto = {
      id: randomUUID(),
      userId: USER_ID,
      preferences: {
        desiredRoles: ['Backend Engineer'],
        preferredLocations: [],
        remotePreference: 'ANY',
        remotePreferences: ['REMOTE', 'HYBRID', 'ONSITE'],
        requiresSponsorship: false,
        willingToRelocate: false,
      },
      links: { portfolio: 'https://portfolio.example.com' },
      verification: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    profileRepo = { findByUserId: async () => profile, upsert: async () => profile };
    ruleRepo = {
      findByUserId: async () => null,
      upsert: async () => {
        throw new Error('unused');
      },
      setPaused: async () => {
        throw new Error('unused');
      },
    };

    const activeResumeVersion: ApprovedResumeVersionDto = {
      id: randomUUID(),
      userId: USER_ID,
      resumeId: 'resume-1',
      label: 'Backend-focused',
      category: 'ENGINEERING',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    resumeVersionRepo = {
      findManyByUserId: async () => [activeResumeVersion],
      findById: async () => activeResumeVersion,
      create: async () => activeResumeVersion,
      update: async () => activeResumeVersion,
      delete: async () => true,
    };

    const baselineAnswers: ApplicationAnswerDto[] = [
      {
        id: randomUUID(),
        userId: USER_ID,
        questionKey: 'work_authorization',
        answer: 'US Citizen',
        source: 'USER_VERIFIED',
        sensitive: true,
        autoSubmitAllowed: false,
        lastVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        userId: USER_ID,
        questionKey: 'notice_period_days',
        answer: '14',
        source: 'USER_VERIFIED',
        sensitive: true,
        autoSubmitAllowed: false,
        lastVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        userId: USER_ID,
        questionKey: 'years_of_experience',
        answer: '5',
        source: 'USER_VERIFIED',
        sensitive: false,
        autoSubmitAllowed: true,
        lastVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    answerRepo = {
      findManyByUserId: async () => baselineAnswers,
      findByUserIdAndKey: async (_u, key) =>
        baselineAnswers.find((a) => a.questionKey === key) ?? null,
      findById: async () => null,
      create: async () => {
        throw new Error('unused');
      },
      update: async () => {
        throw new Error('unused');
      },
      delete: async () => true,
    };

    const eligibilityService = new EligibilityService(profileRepo, ruleRepo, jobEligibilityLookup);
    const channelDetectionService = new ChannelDetectionService(jobChannelLookup);
    jobApplicationService = new JobApplicationService(
      jobAppRepo,
      eligibilityService,
      jobEligibilityLookup,
    );

    const adapterRegistry = new JobApplicationAdapterRegistry();
    adapterRegistry.register(new ExternalRedirectAdapter());

    const readinessService = new ApplicationReadinessService(
      { isAutoApplyEnabled: () => true },
      jobEligibilityLookup,
      jobChannelLookup,
      channelDetectionService,
      adapterRegistry,
      profileRepo,
      answerRepo,
      resumeVersionRepo,
      ruleRepo,
      consentRepo,
      jobAppRepo,
      {
        findByUserId: async () => ({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: null,
        }),
      },
      { findOverallScore: async () => 0.92 },
      { findActiveByUserAndJobId: async () => null },
      eligibilityService,
    );

    plannerService = new ApplicationPlannerService(
      jobAppRepo,
      jobApplicationService,
      channelDetectionService,
      resumeVersionRepo,
      answerRepo,
      readinessService,
    );

    const eventService = new AutoApplyEventService(eventRepo);
    const processingService = new SubmissionProcessingService(
      jobAppRepo,
      consentRepo,
      attemptRepo,
      jobChannelLookup,
      adapterRegistry,
      eventService,
      readinessService,
    );
    queuePort = new InlineWorkerQueuePort(processingService);
    orchestrationService = new SubmissionOrchestrationService(
      jobApplicationService,
      jobAppRepo,
      attemptRepo,
      queuePort,
      readinessService,
      ruleRepo,
    );
  });

  it('carries a job from tracking to a confirmed submission, exactly through the real service graph', async () => {
    // 1. Track the job for auto-apply.
    const initiated = await jobApplicationService.initiate(USER_ID, JOB_ID);
    expect(initiated.application.status).toBe('DISCOVERED');
    expect(initiated.possibleDuplicates).toHaveLength(0);
    const applicationId = initiated.application.id;

    // 2. Generate the plan: eligibility evaluated, channel detected,
    // resume + answers resolved, decision computed, state advanced.
    const plan = await plannerService.createPlan(USER_ID, JOB_ID);
    expect(plan.decision).toBe('READY_FOR_REVIEW');
    expect(plan.channel).toBe('EXTERNAL_MANUAL');
    expect(plan.eligibility.eligible).toBe(true);
    expect(plan.selectedResumeVersion?.isActive).toBe(true);
    expect(plan.unresolvedQuestions).toHaveLength(0);
    expect(plan.application.status).toBe('READY_FOR_REVIEW');
    expect(plan.contentGenerationAvailable).toBe(false);

    // 2a. Idempotent replan: same inputs, same decision, no regression.
    const replanned = await plannerService.createPlan(USER_ID, JOB_ID);
    expect(replanned.decision).toBe('READY_FOR_REVIEW');
    expect(replanned.application.planVersion).toBe(plan.application.planVersion);

    // 3. Approval is readiness-gated - must fail before consent is granted.
    await expect(orchestrationService.approve(USER_ID, applicationId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'READINESS_CONSENT_REQUIRED',
    });

    // 4. Grant RESUME_USAGE consent, then approval succeeds.
    await consentRepo.grant(USER_ID, 'RESUME_USAGE');
    const approved = await orchestrationService.approve(USER_ID, applicationId);
    expect(approved.status).toBe('APPROVED');

    // 5. Queue for submission - publishes to the queue port with the right payload.
    const queued = await orchestrationService.queueForSubmission(USER_ID, applicationId);
    expect(queued.status).toBe('QUEUED'); // snapshot taken before enqueue() ran the inline worker
    expect(queuePort.lastPayload).toEqual({ jobApplicationId: applicationId, userId: USER_ID });

    // 6. The worker (run synchronously by the inline queue port) claimed the
    // application, revalidated job + consent, submitted through the real
    // ExternalRedirectAdapter, and finalized it as ACTION_REQUIRED (the
    // adapter hands off to the user rather than completing on its own).
    const afterProcessing = await jobApplicationService.getApplication(USER_ID, applicationId);
    expect(afterProcessing.status).toBe('ACTION_REQUIRED');
    expect(afterProcessing.externalConfirmationUrl).toBe(
      'https://acme.example.com/careers/apply/123',
    );
    expect(afterProcessing.failureCode).toBeNull();

    const attempts = attemptRepo.rows.filter((a) => a.jobApplicationId === applicationId);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].outcome).toBe('SUCCEEDED');

    const events = eventRepo.rows.filter((e) => e.jobApplicationId === applicationId);
    expect(events.map((e) => e.eventType)).toContain('SUBMISSION_SUCCEEDED');

    // 7. The user confirms they actually applied on the external site.
    const confirmed = await orchestrationService.confirmCompleted(USER_ID, applicationId);
    expect(confirmed.status).toBe('SUBMITTED');

    // 8. The submission is now terminal-ish and shows up in the user's list.
    const all = await jobApplicationService.listApplications(USER_ID);
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe('SUBMITTED');
  });

  it('blocks a second initiate() for the same job (AJA-PROD-007 exact-match hard check), proving duplicate prevention holds across the full flow', async () => {
    await jobApplicationService.initiate(USER_ID, JOB_ID);

    await expect(jobApplicationService.initiate(USER_ID, JOB_ID)).rejects.toMatchObject({
      statusCode: 409,
      code: 'APPLICATION_EXISTS',
    });
  });

  it('halts queueing if consent is revoked after approval (readiness revalidation at QUEUE)', async () => {
    await jobApplicationService.initiate(USER_ID, JOB_ID);
    await plannerService.createPlan(USER_ID, JOB_ID);
    const application = await jobAppRepo.findByUserIdAndJobId(USER_ID, JOB_ID);
    const applicationId = application!.id;

    const grantedConsent = await consentRepo.grant(USER_ID, 'RESUME_USAGE');
    await orchestrationService.approve(USER_ID, applicationId);

    await consentRepo.revoke(USER_ID, grantedConsent.id);

    await expect(
      orchestrationService.queueForSubmission(USER_ID, applicationId),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'READINESS_CONSENT_REQUIRED',
    });

    const after = await jobApplicationService.getApplication(USER_ID, applicationId);
    expect(after.status).toBe('APPROVED');
  });
});
