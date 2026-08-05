import { ICandidateApplicationProfileRepository } from '@/modules/auto-apply/contracts/candidate-profile.contract.js';
import { IApplicationRuleRepository } from '@/modules/auto-apply/contracts/application-rule.contract.js';
import {
  IEligibilityService,
  IJobEligibilityLookup,
} from '@/modules/auto-apply/contracts/eligibility.contract.js';
import {
  EligibilityCheckResult,
  EligibilityResult,
} from '@/modules/auto-apply/types/eligibility.types.js';
import { DEFAULT_APPLICATION_RULE } from '@/modules/auto-apply/types/application-rule.types.js';
import {
  jobMatchesRemotePreferences,
  resolveRemotePreferences,
} from '@/modules/auto-apply/utils/remote-preferences.util.js';

/**
 * Implements AJA-RULE-001's hard eligibility engine — deliberately
 * independent of recommendation match scoring (`modules/recommendations`,
 * untouched by this service). A job can score 92% semantic match and still
 * be NOT_ELIGIBLE here.
 *
 * Checks the current `Job` schema genuinely supports (remote type, salary
 * ceiling, company/title/source exclusion) are evaluated for real.
 * Work-authorization, sponsorship, and experience-range still report
 * NOT_EVALUATED on the job side (no structured Job fields). Candidate-side
 * fail-closed requirements for those fields live in
 * `ApplicationReadinessService` (INFORMATION_REQUIRED), not here — this
 * service remains the hard incompatibility engine (FAILED → NOT_ELIGIBLE).
 */
export class EligibilityService implements IEligibilityService {
  constructor(
    private readonly profileRepository: ICandidateApplicationProfileRepository,
    private readonly ruleRepository: IApplicationRuleRepository,
    private readonly jobLookup: IJobEligibilityLookup,
  ) {}

  async evaluateForJob(userId: string, jobId: string): Promise<EligibilityResult> {
    const job = await this.jobLookup.findJobSnapshot(jobId);
    if (!job) {
      return {
        eligible: false,
        checks: [{ check: 'JOB_ACTIVE', status: 'FAILED', reason: 'Job not found' }],
      };
    }

    const checks: EligibilityCheckResult[] = [];

    checks.push(
      job.status === 'ACTIVE'
        ? { check: 'JOB_ACTIVE', status: 'PASSED' }
        : {
            check: 'JOB_ACTIVE',
            status: 'FAILED',
            reason: `Job status is ${job.status}, not ACTIVE`,
          },
    );

    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      checks.push({
        check: 'PROFILE_COMPLETE',
        status: 'FAILED',
        reason: 'Candidate application profile has not been set up',
      });
      checks.push({ check: 'REMOTE_PREFERENCE', status: 'NOT_EVALUATED' });
      checks.push({ check: 'SALARY_FLOOR', status: 'NOT_EVALUATED' });
    } else {
      checks.push({ check: 'PROFILE_COMPLETE', status: 'PASSED' });

      const remoteMatch = jobMatchesRemotePreferences(job.remoteType, profile.preferences);
      if (remoteMatch === 'PASSED') {
        checks.push({ check: 'REMOTE_PREFERENCE', status: 'PASSED' });
      } else if (remoteMatch === 'NOT_EVALUATED') {
        checks.push({
          check: 'REMOTE_PREFERENCE',
          status: 'NOT_EVALUATED',
          reason: 'Job does not specify a remote type',
        });
      } else {
        const modes = resolveRemotePreferences(profile.preferences).join(', ');
        checks.push({
          check: 'REMOTE_PREFERENCE',
          status: 'FAILED',
          reason: `Candidate accepts ${modes}, job is ${job.remoteType}`,
        });
      }

      const expectedMin = profile.preferences.expectedSalary?.min;
      if (expectedMin === undefined) {
        checks.push({ check: 'SALARY_FLOOR', status: 'NOT_EVALUATED' });
      } else if (job.salaryMax == null) {
        checks.push({
          check: 'SALARY_FLOOR',
          status: 'NOT_EVALUATED',
          reason: 'Job does not list a salary range',
        });
      } else if (job.salaryMax < expectedMin) {
        checks.push({
          check: 'SALARY_FLOOR',
          status: 'FAILED',
          reason: `Job salary max ${job.salaryMax} is below expected minimum ${expectedMin}`,
        });
      } else {
        checks.push({ check: 'SALARY_FLOOR', status: 'PASSED' });
      }
    }

    const rule = (await this.ruleRepository.findByUserId(userId)) ?? {
      blacklistedCompanySlugs: DEFAULT_APPLICATION_RULE.blacklistedCompanySlugs,
      excludedTitleKeywords: DEFAULT_APPLICATION_RULE.excludedTitleKeywords,
      excludedSources: DEFAULT_APPLICATION_RULE.excludedSources,
    };

    checks.push(
      rule.blacklistedCompanySlugs.includes(job.companySlug)
        ? {
            check: 'COMPANY_BLACKLIST',
            status: 'FAILED',
            reason: `${job.companySlug} is blacklisted`,
          }
        : { check: 'COMPANY_BLACKLIST', status: 'PASSED' },
    );

    const titleLower = job.title.toLowerCase();
    const matchedKeyword = rule.excludedTitleKeywords.find((keyword) =>
      titleLower.includes(keyword.toLowerCase()),
    );
    checks.push(
      matchedKeyword
        ? {
            check: 'TITLE_EXCLUSION',
            status: 'FAILED',
            reason: `Title contains excluded keyword "${matchedKeyword}"`,
          }
        : { check: 'TITLE_EXCLUSION', status: 'PASSED' },
    );

    const matchedSource = job.sourceProviders.find((provider) =>
      rule.excludedSources.includes(provider),
    );
    checks.push(
      matchedSource
        ? {
            check: 'SOURCE_EXCLUSION',
            status: 'FAILED',
            reason: `Source "${matchedSource}" is excluded`,
          }
        : { check: 'SOURCE_EXCLUSION', status: 'PASSED' },
    );

    checks.push({
      check: 'WORK_AUTHORIZATION',
      status: 'NOT_EVALUATED',
      reason: 'Job data does not yet carry a structured work-authorization requirement',
    });
    checks.push({
      check: 'SPONSORSHIP',
      status: 'NOT_EVALUATED',
      reason: 'Job data does not yet carry a structured sponsorship requirement',
    });
    checks.push({
      check: 'EXPERIENCE_RANGE',
      status: 'NOT_EVALUATED',
      reason: 'Job data does not yet carry a structured experience requirement',
    });

    const eligible = checks.every((check) => check.status !== 'FAILED');

    return { eligible, checks };
  }
}
