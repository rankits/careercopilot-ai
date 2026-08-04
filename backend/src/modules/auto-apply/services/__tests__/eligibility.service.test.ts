import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EligibilityService } from '@/modules/auto-apply/services/eligibility.service.js';
import { ICandidateApplicationProfileRepository } from '@/modules/auto-apply/contracts/candidate-profile.contract.js';
import { IApplicationRuleRepository } from '@/modules/auto-apply/contracts/application-rule.contract.js';
import {
  IJobEligibilityLookup,
  JobEligibilitySnapshot,
} from '@/modules/auto-apply/contracts/eligibility.contract.js';
import { CandidateApplicationProfileDto } from '@/modules/auto-apply/types/candidate-profile.types.js';
import { ApplicationRuleDto } from '@/modules/auto-apply/types/application-rule.types.js';

describe('EligibilityService', () => {
  let profileRepo: ICandidateApplicationProfileRepository;
  let ruleRepo: IApplicationRuleRepository;
  let jobLookup: IJobEligibilityLookup;
  let service: EligibilityService;

  const activeJob: JobEligibilitySnapshot = {
    id: 'job-1',
    title: 'Backend Engineer',
    companySlug: 'acme',
    remoteType: 'REMOTE',
    salaryMax: 150000,
    status: 'ACTIVE',
    sourceProviders: ['GREENHOUSE'],
  };

  const completeProfile: CandidateApplicationProfileDto = {
    id: 'profile-1',
    userId: 'user-1',
    preferences: {
      desiredRoles: [],
      preferredLocations: [],
      remotePreference: 'REMOTE',
      expectedSalary: { min: 120000 },
    },
    links: {},
    verification: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const emptyRule: ApplicationRuleDto = {
    id: 'rule-1',
    userId: 'user-1',
    minMatchScore: 0.85,
    dailyApplicationLimit: 5,
    weeklyApplicationLimit: null,
    blacklistedCompanySlugs: [],
    excludedTitleKeywords: [],
    excludedSources: [],
    autopilotEnabled: false,
    autopilotPausedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    profileRepo = { findByUserId: vi.fn().mockResolvedValue(completeProfile), upsert: vi.fn() };
    ruleRepo = {
      findByUserId: vi.fn().mockResolvedValue(emptyRule),
      upsert: vi.fn(),
      setPaused: vi.fn(),
    };
    jobLookup = { findJobSnapshot: vi.fn().mockResolvedValue(activeJob) };
    service = new EligibilityService(profileRepo, ruleRepo, jobLookup);
  });

  it('is eligible when every hard check passes', async () => {
    const result = await service.evaluateForJob('user-1', 'job-1');
    expect(result.eligible).toBe(true);
    expect(result.checks.find((c) => c.check === 'JOB_ACTIVE')?.status).toBe('PASSED');
  });

  it('is NOT_ELIGIBLE (job not found) without fabricating a job snapshot', async () => {
    vi.mocked(jobLookup.findJobSnapshot).mockResolvedValue(null);
    const result = await service.evaluateForJob('user-1', 'missing-job');
    expect(result.eligible).toBe(false);
    expect(result.checks).toEqual([
      { check: 'JOB_ACTIVE', status: 'FAILED', reason: 'Job not found' },
    ]);
  });

  it('fails JOB_ACTIVE when the job is not ACTIVE', async () => {
    vi.mocked(jobLookup.findJobSnapshot).mockResolvedValue({ ...activeJob, status: 'CLOSED' });
    const result = await service.evaluateForJob('user-1', 'job-1');
    expect(result.eligible).toBe(false);
    expect(result.checks.find((c) => c.check === 'JOB_ACTIVE')).toMatchObject({ status: 'FAILED' });
  });

  it('fails PROFILE_COMPLETE and skips preference checks when no profile exists', async () => {
    vi.mocked(profileRepo.findByUserId).mockResolvedValue(null);
    const result = await service.evaluateForJob('user-1', 'job-1');
    expect(result.eligible).toBe(false);
    expect(result.checks.find((c) => c.check === 'PROFILE_COMPLETE')).toMatchObject({
      status: 'FAILED',
    });
    expect(result.checks.find((c) => c.check === 'REMOTE_PREFERENCE')).toMatchObject({
      status: 'NOT_EVALUATED',
    });
  });

  it('fails REMOTE_PREFERENCE when candidate requires ONSITE but job is REMOTE', async () => {
    vi.mocked(profileRepo.findByUserId).mockResolvedValue({
      ...completeProfile,
      preferences: { ...completeProfile.preferences, remotePreference: 'ONSITE' },
    });
    const result = await service.evaluateForJob('user-1', 'job-1');
    expect(result.eligible).toBe(false);
    expect(result.checks.find((c) => c.check === 'REMOTE_PREFERENCE')).toMatchObject({
      status: 'FAILED',
    });
  });

  it('marks REMOTE_PREFERENCE NOT_EVALUATED when the job has no remoteType', async () => {
    vi.mocked(jobLookup.findJobSnapshot).mockResolvedValue({ ...activeJob, remoteType: null });
    const result = await service.evaluateForJob('user-1', 'job-1');
    expect(result.checks.find((c) => c.check === 'REMOTE_PREFERENCE')).toMatchObject({
      status: 'NOT_EVALUATED',
    });
  });

  it('fails SALARY_FLOOR when job salaryMax is below the candidate expected minimum', async () => {
    vi.mocked(jobLookup.findJobSnapshot).mockResolvedValue({ ...activeJob, salaryMax: 90000 });
    const result = await service.evaluateForJob('user-1', 'job-1');
    expect(result.eligible).toBe(false);
    expect(result.checks.find((c) => c.check === 'SALARY_FLOOR')).toMatchObject({
      status: 'FAILED',
    });
  });

  it('fails COMPANY_BLACKLIST when the job company is blacklisted', async () => {
    vi.mocked(ruleRepo.findByUserId).mockResolvedValue({
      ...emptyRule,
      blacklistedCompanySlugs: ['acme'],
    });
    const result = await service.evaluateForJob('user-1', 'job-1');
    expect(result.eligible).toBe(false);
    expect(result.checks.find((c) => c.check === 'COMPANY_BLACKLIST')).toMatchObject({
      status: 'FAILED',
    });
  });

  it('fails TITLE_EXCLUSION when the job title contains an excluded keyword', async () => {
    vi.mocked(ruleRepo.findByUserId).mockResolvedValue({
      ...emptyRule,
      excludedTitleKeywords: ['backend'],
    });
    const result = await service.evaluateForJob('user-1', 'job-1');
    expect(result.eligible).toBe(false);
    expect(result.checks.find((c) => c.check === 'TITLE_EXCLUSION')).toMatchObject({
      status: 'FAILED',
    });
  });

  it('fails SOURCE_EXCLUSION when the job source provider is excluded', async () => {
    vi.mocked(ruleRepo.findByUserId).mockResolvedValue({
      ...emptyRule,
      excludedSources: ['GREENHOUSE'],
    });
    const result = await service.evaluateForJob('user-1', 'job-1');
    expect(result.eligible).toBe(false);
    expect(result.checks.find((c) => c.check === 'SOURCE_EXCLUSION')).toMatchObject({
      status: 'FAILED',
    });
  });

  it('falls back to permissive defaults when no rule config has been saved yet', async () => {
    vi.mocked(ruleRepo.findByUserId).mockResolvedValue(null);
    const result = await service.evaluateForJob('user-1', 'job-1');
    expect(result.eligible).toBe(true);
  });

  it('never fabricates work authorization, sponsorship, or experience checks', async () => {
    const result = await service.evaluateForJob('user-1', 'job-1');
    for (const check of ['WORK_AUTHORIZATION', 'SPONSORSHIP', 'EXPERIENCE_RANGE'] as const) {
      expect(result.checks.find((c) => c.check === check)).toMatchObject({
        status: 'NOT_EVALUATED',
      });
    }
  });
});
