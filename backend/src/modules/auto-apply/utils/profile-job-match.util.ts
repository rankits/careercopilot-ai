import { createHash } from 'node:crypto';

import type { ApplicationPageAnalysisDto } from '@/modules/auto-apply/types/application-page-analysis.types.js';
import type { CandidateApplicationProfileDto } from '@/modules/auto-apply/types/candidate-profile.types.js';
import type {
  ProfileJobMatchResult,
  ProfileMatchConfidence,
  ProfileMatchEligibility,
  ProfileMatchEvidenceItem,
  ProfileMatchExperience,
  ProfileMatchLocation,
  ProfileMatchRole,
  ProfileMatchSkills,
  ProfileMatchSponsorship,
  ProfileMatchWorkAuthorization,
} from '@/modules/auto-apply/types/profile-job-match.types.js';

export interface ProfileJobMatchJobFacts {
  readonly id: string;
  readonly title: string;
  readonly companySlug: string;
  readonly employmentType?: string | null;
  readonly remoteType?: string | null;
  readonly descriptionText?: string | null;
  readonly skills: string[];
}

export interface ProfileJobMatchCandidateFacts {
  readonly profile: CandidateApplicationProfileDto | null;
  readonly answers: ReadonlyMap<string, string>;
}

function answer(answers: ReadonlyMap<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = answers.get(key)?.trim();
    if (value) return value;
  }
  return null;
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+#.]/g, ' ')
    .replace(/\s+/g, ' ');
}

function tokensOverlap(a: string, b: string): boolean {
  const left = new Set(
    normalizeToken(a)
      .split(' ')
      .filter((t) => t.length > 1),
  );
  const right = new Set(
    normalizeToken(b)
      .split(' ')
      .filter((t) => t.length > 1),
  );
  if (left.size === 0 || right.size === 0) return false;
  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }
  return shared / Math.min(left.size, right.size) >= 0.5;
}

function parseYears(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number.parseFloat(
    raw
      .replace(/[^0-9.]/g, ' ')
      .trim()
      .split(/\s+/)[0] ?? '',
  );
  return Number.isFinite(parsed) ? parsed : null;
}

function sponsorshipRequiredFromVault(answers: ReadonlyMap<string, string>): boolean | null {
  const raw = answer(answers, 'sponsorship_required')?.toLowerCase();
  if (!raw) return null;
  if (['yes', 'true', '1', 'required'].includes(raw)) return true;
  if (['no', 'false', '0', 'not required', 'not_required'].includes(raw)) return false;
  return null;
}

function normalizeRegion(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '_');
}

function regionCompatible(
  candidateRaw: string,
  requirementValue: unknown,
  geographic?: {
    explicitCountries?: string[];
    normalizedRegion?: string;
    interpretationStatus?: string;
  },
): boolean {
  const candidate = normalizeRegion(candidateRaw);
  const allowed = new Set<string>();
  for (const country of geographic?.explicitCountries ?? []) {
    allowed.add(normalizeRegion(country));
  }
  if (geographic?.normalizedRegion) {
    allowed.add(normalizeRegion(geographic.normalizedRegion));
  }
  if (Array.isArray(requirementValue)) {
    for (const item of requirementValue) {
      allowed.add(normalizeRegion(String(item)));
    }
  }
  if (allowed.has(candidate)) return true;
  if (
    (allowed.has('NORTH_AMERICA') || allowed.has('UNITED_STATES') || allowed.has('US')) &&
    (candidate === 'INDIA' || candidate === 'IN' || candidate.includes('ASIA'))
  ) {
    return false;
  }
  return allowed.has(candidate);
}

function findRequirement(analysis: ApplicationPageAnalysisDto | null, code: string) {
  return analysis?.requirements.find((item) => item.code === code) ?? null;
}

function isHardRequirement(requirement: {
  importance: string;
  assertion: string;
  evidenceStrength: string;
}): boolean {
  if (requirement.importance !== 'REQUIRED') return false;
  if (
    requirement.assertion !== 'REQUIRES' &&
    requirement.assertion !== 'DOES_NOT_ALLOW' &&
    requirement.assertion !== 'DOES_NOT_PROVIDE'
  ) {
    return false;
  }
  return (
    requirement.evidenceStrength === 'AUTHORITATIVE_STRUCTURED' ||
    requirement.evidenceStrength === 'EXPLICIT_TEXT'
  );
}

export function computeProfileJobMatchContentHash(input: {
  analysisId: string | null;
  jobId: string;
  jobTitle: string;
  jobSkills: string[];
  preferences: unknown;
  answers: Record<string, string>;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        analysisId: input.analysisId,
        jobId: input.jobId,
        jobTitle: input.jobTitle,
        jobSkills: input.jobSkills,
        preferences: input.preferences,
        answers: input.answers,
        schemaVersion: 1,
      }),
    )
    .digest('hex');
}

/**
 * Pure profile↔job matcher. Never reads resume text or resume parse payloads.
 */
export function computeProfileJobMatch(input: {
  job: ProfileJobMatchJobFacts;
  analysis: ApplicationPageAnalysisDto | null;
  candidate: ProfileJobMatchCandidateFacts;
  recommendationScoreFallback?: number | null;
  now?: Date;
}): ProfileJobMatchResult {
  const now = input.now ?? new Date();
  const prefs = input.candidate.profile?.preferences;
  const answers = input.candidate.answers;
  const warnings: ProfileMatchEvidenceItem[] = [];
  const missingInformation: ProfileMatchEvidenceItem[] = [];
  const blockers: ProfileMatchEvidenceItem[] = [];

  if (!input.analysis) {
    warnings.push({
      code: 'ANALYSIS_UNAVAILABLE',
      message: 'Job page analysis is not available yet; matching used stored job data only.',
      source: 'ANALYSIS',
    });
  } else if (new Date(input.analysis.expiresAt) <= now) {
    warnings.push({
      code: 'ANALYSIS_STALE',
      message: 'Job analysis is stale. Re-run prepare to refresh requirements.',
      source: 'ANALYSIS',
    });
  }

  // ── Role ──────────────────────────────────────────────────────────────
  const desiredRoles = prefs?.desiredRoles ?? [];
  let roleMatch: ProfileMatchRole;
  if (!input.job.title.trim()) {
    roleMatch = {
      status: 'UNKNOWN',
      evidence: [
        { code: 'JOB_TITLE_MISSING', message: 'Job title is unavailable.', source: 'JOB' },
      ],
      jobTitle: null,
      desiredRoles,
    };
  } else if (desiredRoles.length === 0) {
    roleMatch = {
      status: 'UNKNOWN',
      evidence: [
        {
          code: 'DESIRED_ROLES_MISSING',
          message: 'Add desired roles in your application profile to assess title fit.',
          field: 'desiredRoles',
          source: 'PROFILE',
        },
      ],
      jobTitle: input.job.title,
      desiredRoles,
    };
    missingInformation.push(roleMatch.evidence[0]!);
  } else {
    const exact = desiredRoles.some(
      (role) => normalizeToken(role) === normalizeToken(input.job.title),
    );
    const partial = desiredRoles.some((role) => tokensOverlap(role, input.job.title));
    roleMatch = {
      status: exact ? 'MATCH' : partial ? 'PARTIAL' : 'NO_MATCH',
      evidence: [
        {
          code: exact ? 'ROLE_EXACT' : partial ? 'ROLE_PARTIAL' : 'ROLE_NO_MATCH',
          message: exact
            ? `Job title aligns with your desired role.`
            : partial
              ? `Job title partially overlaps your desired roles.`
              : `Job title does not overlap your desired roles (soft signal).`,
          source: 'PROFILE',
        },
      ],
      jobTitle: input.job.title,
      desiredRoles,
    };
    if (roleMatch.status === 'NO_MATCH') {
      warnings.push(roleMatch.evidence[0]!);
    }
  }

  // ── Skills (job skills only; candidate skills come later via resume stage) ─
  const jobSkills = input.job.skills.map((s) => s.trim()).filter(Boolean);
  const skillsMatch: ProfileMatchSkills = {
    matched: [],
    missing: [],
    unknown: jobSkills,
  };
  if (jobSkills.length > 0) {
    warnings.push({
      code: 'SKILLS_PROFILE_NOT_AVAILABLE',
      message:
        'Skills were not confirmed from your application profile. Resume-based skill matching comes in a later step.',
      source: 'PROFILE',
    });
  }

  // ── Experience ────────────────────────────────────────────────────────
  const experienceReq = findRequirement(input.analysis, 'TOTAL_EXPERIENCE_YEARS');
  const candidateYears = parseYears(answer(answers, 'years_of_experience'));
  let experienceMatch: ProfileMatchExperience;
  if (!experienceReq || !isHardRequirement(experienceReq)) {
    experienceMatch = {
      requiredYears: experienceReq ? Number(experienceReq.value) || null : null,
      candidateYears,
      status: experienceReq ? (candidateYears == null ? 'UNKNOWN' : 'MATCH') : 'UNKNOWN',
      evidence: experienceReq
        ? []
        : [
            {
              code: 'EXPERIENCE_NOT_EXTRACTED',
              message: 'No explicit years-of-experience requirement was extracted.',
              source: 'ANALYSIS',
            },
          ],
    };
  } else {
    const requiredYears = Number(experienceReq.value);
    if (candidateYears == null) {
      const item: ProfileMatchEvidenceItem = {
        code: 'EXPERIENCE_REQUIREMENT_UNKNOWN',
        message: `Confirm your years of experience. This role asks for at least ${requiredYears}+ years.`,
        field: 'yearsOfExperience',
        source: 'ANSWER_VAULT',
      };
      experienceMatch = {
        requiredYears,
        candidateYears: null,
        status: 'UNKNOWN',
        evidence: [item],
      };
      missingInformation.push(item);
    } else if (!Number.isFinite(requiredYears) || candidateYears >= requiredYears) {
      experienceMatch = {
        requiredYears: Number.isFinite(requiredYears) ? requiredYears : null,
        candidateYears,
        status: 'MATCH',
        evidence: [
          {
            code: 'EXPERIENCE_MET',
            message: `Your ${candidateYears} years meet the required ${requiredYears}+.`,
            source: 'ANSWER_VAULT',
          },
        ],
      };
    } else {
      const item: ProfileMatchEvidenceItem = {
        code: 'EXPERIENCE_REQUIREMENT_NOT_MET',
        message: `This role requires at least ${requiredYears} years of experience.`,
        field: 'yearsOfExperience',
        source: 'ANALYSIS',
      };
      experienceMatch = {
        requiredYears,
        candidateYears,
        status: 'GAP',
        evidence: [item],
      };
      blockers.push(item);
    }
  }

  // ── Location ──────────────────────────────────────────────────────────
  const regionReq = findRequirement(input.analysis, 'WORK_REGION');
  const candidateRegion =
    answer(answers, 'current_work_region', 'work_region') ??
    prefs?.currentCountry ??
    prefs?.currentLocation ??
    null;
  let locationMatch: ProfileMatchLocation;
  if (!regionReq || !isHardRequirement(regionReq)) {
    locationMatch = {
      status: 'NOT_APPLICABLE',
      evidence: [
        {
          code: 'LOCATION_NOT_RESTRICTED',
          message: 'No hard work-region restriction was extracted from the posting.',
          source: 'ANALYSIS',
        },
      ],
      jobRequirement: regionReq?.value ?? null,
      candidateRegion,
    };
  } else if (!candidateRegion) {
    const item: ProfileMatchEvidenceItem = {
      code: 'WORK_REGION_VERIFICATION_REQUIRED',
      message:
        'Confirm your current work region. This job restricts where candidates may be based.',
      field: 'currentWorkRegion',
      source: 'ANSWER_VAULT',
    };
    locationMatch = {
      status: 'UNKNOWN',
      evidence: [item],
      jobRequirement: regionReq.value,
      candidateRegion: null,
    };
    missingInformation.push(item);
  } else if (regionCompatible(candidateRegion, regionReq.value, regionReq.geographic)) {
    locationMatch = {
      status: 'MATCH',
      evidence: [
        {
          code: 'LOCATION_COMPATIBLE',
          message: 'Your work region is compatible with this role.',
          source: 'ANSWER_VAULT',
        },
      ],
      jobRequirement: regionReq.value,
      candidateRegion,
    };
  } else {
    const item: ProfileMatchEvidenceItem = {
      code: 'JOB_LOCATION_REQUIREMENT_NOT_MET',
      message:
        regionReq.sourceText ?? 'This role is limited to candidates in the required work region.',
      field: 'currentWorkRegion',
      source: 'ANALYSIS',
    };
    locationMatch = {
      status: 'NO_MATCH',
      evidence: [item],
      jobRequirement: regionReq.value,
      candidateRegion,
    };
    blockers.push(item);
  }

  // ── Work authorization ────────────────────────────────────────────────
  const authReq = findRequirement(input.analysis, 'WORK_AUTHORIZATION');
  const workAuthAnswer = answer(answers, 'work_authorization');
  let workAuthorizationMatch: ProfileMatchWorkAuthorization;
  if (!workAuthAnswer) {
    const item: ProfileMatchEvidenceItem = {
      code: 'WORK_AUTHORIZATION_MISSING',
      message: 'Confirm your work authorization in Application Setup.',
      field: 'workAuthorization',
      source: 'ANSWER_VAULT',
    };
    workAuthorizationMatch = {
      status: 'UNKNOWN',
      evidence: [item],
      candidateAnswer: null,
    };
    missingInformation.push(item);
  } else if (authReq && isHardRequirement(authReq)) {
    workAuthorizationMatch = {
      status: 'MATCH',
      evidence: [
        {
          code: 'WORK_AUTHORIZATION_PROVIDED',
          message: 'Work authorization is on file. Final form wording may still vary by employer.',
          source: 'ANSWER_VAULT',
        },
      ],
      candidateAnswer: workAuthAnswer,
    };
  } else {
    workAuthorizationMatch = {
      status: 'MATCH',
      evidence: [
        {
          code: 'WORK_AUTHORIZATION_PROVIDED',
          message: 'Work authorization is on file.',
          source: 'ANSWER_VAULT',
        },
      ],
      candidateAnswer: workAuthAnswer,
    };
  }

  // ── Sponsorship ───────────────────────────────────────────────────────
  const sponsorshipReq = findRequirement(input.analysis, 'SPONSORSHIP');
  const fromVault = sponsorshipRequiredFromVault(answers);
  const requiresSponsorship =
    fromVault ??
    (typeof prefs?.requiresSponsorship === 'boolean' ? prefs.requiresSponsorship : null);
  let sponsorshipMatch: ProfileMatchSponsorship;
  const jobDoesNotProvide =
    sponsorshipReq?.assertion === 'DOES_NOT_PROVIDE' ||
    sponsorshipReq?.assertion === 'DOES_NOT_ALLOW';
  const jobProvides = sponsorshipReq?.assertion === 'REQUIRES' ? null : !jobDoesNotProvide;

  if (requiresSponsorship == null && sponsorshipReq && isHardRequirement(sponsorshipReq)) {
    const item: ProfileMatchEvidenceItem = {
      code: 'SPONSORSHIP_UNKNOWN',
      message: 'Confirm whether you need visa sponsorship for this role.',
      field: 'requiresSponsorship',
      source: 'PROFILE',
    };
    sponsorshipMatch = {
      status: 'UNKNOWN',
      evidence: [item],
      candidateRequiresSponsorship: null,
      jobProvidesSponsorship: jobDoesNotProvide ? false : jobProvides,
    };
    missingInformation.push(item);
  } else if (jobDoesNotProvide && requiresSponsorship === true) {
    const item: ProfileMatchEvidenceItem = {
      code: 'SPONSORSHIP_JOB_REQUIREMENT_NOT_MET',
      message:
        sponsorshipReq?.sourceText ??
        'This employer does not provide sponsorship, and you indicated you need it.',
      field: 'requiresSponsorship',
      source: 'ANALYSIS',
    };
    sponsorshipMatch = {
      status: 'NO_MATCH',
      evidence: [item],
      candidateRequiresSponsorship: true,
      jobProvidesSponsorship: false,
    };
    blockers.push(item);
  } else if (requiresSponsorship == null) {
    sponsorshipMatch = {
      status: 'UNKNOWN',
      evidence: [
        {
          code: 'SPONSORSHIP_UNKNOWN_COMPATIBILITY',
          message: 'Sponsorship preference is not set; compatibility is unknown.',
          field: 'requiresSponsorship',
          source: 'PROFILE',
        },
      ],
      candidateRequiresSponsorship: null,
      jobProvidesSponsorship: jobDoesNotProvide ? false : null,
    };
    warnings.push(sponsorshipMatch.evidence[0]!);
  } else {
    sponsorshipMatch = {
      status: 'MATCH',
      evidence: [
        {
          code: 'SPONSORSHIP_COMPATIBLE',
          message: 'Sponsorship preference is compatible with this posting.',
          source: 'PROFILE',
        },
      ],
      candidateRequiresSponsorship: requiresSponsorship,
      jobProvidesSponsorship: jobDoesNotProvide ? false : true,
    };
  }

  // ── Eligibility rollup ────────────────────────────────────────────────
  let eligibility: ProfileMatchEligibility;
  if (blockers.length > 0) {
    eligibility = { status: 'NOT_ELIGIBLE', blockers };
  } else if (missingInformation.length > 0) {
    eligibility = { status: 'INFORMATION_REQUIRED', blockers: [] };
  } else {
    eligibility = { status: 'ELIGIBLE', blockers: [] };
  }

  // ── Overall alignment + confidence ────────────────────────────────────
  const componentScores: number[] = [];
  const pushStatus = (status: string, weight = 1) => {
    if (status === 'MATCH') componentScores.push(1 * weight);
    else if (status === 'PARTIAL' || status === 'NOT_APPLICABLE')
      componentScores.push(0.7 * weight);
    else if (status === 'UNKNOWN') componentScores.push(0.4 * weight);
    else if (status === 'GAP' || status === 'NO_MATCH') componentScores.push(0 * weight);
  };
  pushStatus(roleMatch.status, 1.2);
  pushStatus(experienceMatch.status === 'GAP' ? 'GAP' : experienceMatch.status, 1.2);
  pushStatus(locationMatch.status, 1.5);
  pushStatus(workAuthorizationMatch.status, 1);
  pushStatus(sponsorshipMatch.status, 1.2);
  // Soft: unknown skills don't tank score as hard fail
  if (jobSkills.length > 0) componentScores.push(0.5);

  const overallAlignment =
    componentScores.length === 0
      ? null
      : Math.round(
          (componentScores.reduce((sum, value) => sum + value, 0) / componentScores.length) * 1000,
        ) / 1000;

  let confidence: ProfileMatchConfidence = 'MEDIUM';
  if (blockers.length > 0 || missingInformation.length >= 2) confidence = 'LOW';
  else if (
    missingInformation.length === 0 &&
    warnings.filter((w) => w.code !== 'SKILLS_PROFILE_NOT_AVAILABLE').length === 0 &&
    input.analysis &&
    new Date(input.analysis.expiresAt) > now
  ) {
    confidence = 'HIGH';
  } else if (missingInformation.length > 0 || !input.analysis) {
    confidence = 'LOW';
  }

  if (
    input.recommendationScoreFallback != null &&
    Number.isFinite(input.recommendationScoreFallback)
  ) {
    warnings.push({
      code: 'RECOMMENDATION_SCORE_CONTEXT',
      message: `General recommendation score (${Math.round(input.recommendationScoreFallback * 100)}) is historical context only — not this application's profile match.`,
      source: 'JOB',
    });
  }

  const topStrengths: string[] = [];
  const pushStrength = (status: string, evidence: ProfileMatchEvidenceItem[]) => {
    if (status !== 'MATCH' && status !== 'PARTIAL' && status !== 'NOT_APPLICABLE') return;
    for (const item of evidence) {
      if (item.message && !topStrengths.includes(item.message)) {
        topStrengths.push(item.message);
      }
    }
  };
  pushStrength(roleMatch.status, roleMatch.evidence);
  pushStrength(experienceMatch.status, experienceMatch.evidence);
  pushStrength(locationMatch.status, locationMatch.evidence);
  pushStrength(workAuthorizationMatch.status, workAuthorizationMatch.evidence);
  pushStrength(sponsorshipMatch.status, sponsorshipMatch.evidence);
  for (const skill of skillsMatch.matched) {
    const line = `Matched skill: ${skill}`;
    if (!topStrengths.includes(line)) topStrengths.push(line);
  }

  const keyGaps: string[] = [];
  const pushGap = (message: string) => {
    if (message && !keyGaps.includes(message)) keyGaps.push(message);
  };
  for (const item of blockers) pushGap(item.message);
  for (const item of missingInformation) pushGap(item.message);
  for (const skill of skillsMatch.missing) pushGap(`Missing skill: ${skill}`);
  for (const skill of skillsMatch.unknown.slice(0, 4)) {
    pushGap(`Unconfirmed skill: ${skill}`);
  }
  for (const warning of warnings) {
    if (
      warning.code === 'RECOMMENDATION_SCORE_CONTEXT' ||
      warning.code === 'SKILLS_PROFILE_NOT_AVAILABLE'
    ) {
      continue;
    }
    if (
      warning.code === 'ROLE_NO_MATCH' ||
      warning.code === 'ANALYSIS_UNAVAILABLE' ||
      warning.code === 'ANALYSIS_STALE' ||
      warning.code === 'SPONSORSHIP_UNKNOWN_COMPATIBILITY'
    ) {
      pushGap(warning.message);
    }
  }

  const dataSources = {
    verifiedProfile: Boolean(input.candidate.profile),
    answerVault: answers.size > 0,
    storedJobData: Boolean(input.job.id && (input.job.title.trim() || input.job.skills.length > 0)),
    jobPageAnalysis: Boolean(input.analysis?.id),
  };

  return {
    overallAlignment,
    eligibility,
    roleMatch,
    skillsMatch,
    experienceMatch,
    locationMatch,
    workAuthorizationMatch,
    sponsorshipMatch,
    confidence,
    warnings,
    missingInformation,
    topStrengths: topStrengths.slice(0, 8),
    keyGaps: keyGaps.slice(0, 10),
    dataSources,
    recommendationScoreFallback: input.recommendationScoreFallback ?? null,
    analysisId: input.analysis?.id ?? null,
    jobId: input.job.id,
    matchedAt: now.toISOString(),
    schemaVersion: 1,
  };
}
