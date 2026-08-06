import type {
  ProfileJobMatchDto,
  ProfileMatchEvidenceDto,
} from '@/features/auto-apply/types/autoApply.types';
import {
  destinationToSetupHref,
  resolveReadinessFixActions,
} from '@/pages/AutoApplyPage/missingFieldNavigation';

export type FitOverallLabel =
  'GOOD_MATCH' | 'PARTIAL_MATCH' | 'LIMITED' | 'NOT_ELIGIBLE' | 'UNKNOWN';

export type FitBannerTone = 'success' | 'warning' | 'error' | 'info';

export interface FitDimensionView {
  id: string;
  title: string;
  description: string;
  status: string;
  statusLabel: string;
  summary: string;
  evidence: string[];
  score: number | null;
  scoreLabel: string | null;
}

export interface FitMissingInfoView {
  field?: string;
  label: string;
  message: string;
  href: string | null;
}

export interface ProfileMatchViewModel {
  overallAlignmentPct: number | null;
  overallLabel: FitOverallLabel;
  overallLabelText: string;
  bannerTone: FitBannerTone;
  bannerTitle: string;
  bannerBody: string;
  eligibilityStatus: string;
  eligibilityLabel: string;
  confidence: string;
  confidenceReason: string;
  informationRequiredCount: number;
  missingInfo: FitMissingInfoView[];
  dimensions: FitDimensionView[];
  eligibilityChecklist: Array<{
    title: string;
    status: string;
    summary: string;
    blocking: boolean;
  }>;
  topStrengths: string[];
  keyGaps: string[];
  warnings: ProfileMatchEvidenceDto[];
  sourcesUsed: {
    verifiedProfile: boolean;
    answerVault: boolean;
    storedJobData: boolean;
    jobPageAnalysis: boolean;
  };
  updatedAt: string | null;
  recommendationContextPct: number | null;
  skillsMatched: string[];
  skillsMissing: string[];
  skillsUnknown: string[];
}

function statusScore(status: string): number | null {
  switch (status) {
    case 'MATCH':
    case 'ELIGIBLE':
    case 'CONFIRMED':
      return 100;
    case 'PARTIAL':
    case 'NOT_APPLICABLE':
      return 70;
    case 'UNKNOWN':
      return 40;
    case 'GAP':
    case 'NO_MATCH':
    case 'NOT_ELIGIBLE':
      return 0;
    default:
      return null;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'MATCH':
      return 'Good Match';
    case 'PARTIAL':
      return 'Partial Match';
    case 'NO_MATCH':
      return 'No Match';
    case 'GAP':
      return 'Gap';
    case 'UNKNOWN':
      return 'Unknown';
    case 'NOT_APPLICABLE':
      return 'Not required';
    case 'ELIGIBLE':
      return 'Eligible';
    case 'NOT_ELIGIBLE':
      return 'Not eligible';
    case 'INFORMATION_REQUIRED':
      return 'Info required';
    case 'CONFIRMED':
      return 'Confirmed';
    default:
      return status.replaceAll('_', ' ');
  }
}

function firstMessage(evidence: ProfileMatchEvidenceDto[] | undefined, fallback: string): string {
  return evidence?.[0]?.message ?? fallback;
}

function evidenceLines(evidence: ProfileMatchEvidenceDto[] | undefined): string[] {
  return (evidence ?? []).map((item) => item.message).filter(Boolean);
}

function collectEvidenceSources(match: ProfileJobMatchDto): Set<string> {
  const sources = new Set<string>();
  const push = (items: ProfileMatchEvidenceDto[] | undefined) => {
    for (const item of items ?? []) {
      if (item.source) sources.add(item.source);
    }
  };
  push(match.eligibility.blockers);
  push(match.roleMatch.evidence);
  push(match.experienceMatch.evidence);
  push(match.locationMatch.evidence);
  push(match.workAuthorizationMatch.evidence);
  push(match.sponsorshipMatch.evidence);
  push(match.warnings);
  push(match.missingInformation);
  return sources;
}

function deriveDataSources(match: ProfileJobMatchDto): ProfileMatchViewModel['sourcesUsed'] {
  if (match.dataSources) {
    return { ...match.dataSources };
  }
  const sources = collectEvidenceSources(match);
  return {
    verifiedProfile: sources.has('PROFILE'),
    answerVault: sources.has('ANSWER_VAULT'),
    storedJobData: sources.has('JOB') || Boolean(match.jobId),
    jobPageAnalysis: sources.has('ANALYSIS') || Boolean(match.analysisId),
  };
}

function deriveTopStrengths(match: ProfileJobMatchDto, dimensions: FitDimensionView[]): string[] {
  if (match.topStrengths && match.topStrengths.length > 0) {
    return match.topStrengths.slice(0, 8);
  }
  const topStrengths: string[] = [];
  for (const dim of dimensions) {
    if (dim.status === 'MATCH' || dim.status === 'PARTIAL' || dim.status === 'NOT_APPLICABLE') {
      if (dim.summary && !topStrengths.includes(dim.summary)) topStrengths.push(dim.summary);
    }
  }
  for (const skill of match.skillsMatch.matched) {
    const line = `Matched skill: ${skill}`;
    if (!topStrengths.includes(line)) topStrengths.push(line);
  }
  return topStrengths.slice(0, 8);
}

function deriveKeyGaps(match: ProfileJobMatchDto): string[] {
  if (match.keyGaps && match.keyGaps.length > 0) {
    return match.keyGaps.slice(0, 10);
  }
  const keyGaps: string[] = [];
  const push = (message: string) => {
    if (message && !keyGaps.includes(message)) keyGaps.push(message);
  };
  for (const blocker of match.eligibility.blockers) push(blocker.message);
  for (const missing of match.missingInformation) push(missing.message);
  for (const skill of match.skillsMatch.missing) push(`Missing skill: ${skill}`);
  for (const skill of match.skillsMatch.unknown.slice(0, 4)) {
    push(`Unconfirmed skill: ${skill}`);
  }
  for (const warning of match.warnings) {
    if (
      warning.code === 'RECOMMENDATION_SCORE_CONTEXT' ||
      warning.code === 'SKILLS_PROFILE_NOT_AVAILABLE'
    ) {
      continue;
    }
    push(warning.message);
  }
  return keyGaps.slice(0, 10);
}

export function resolveOverallLabel(match: ProfileJobMatchDto): FitOverallLabel {
  if (match.eligibility.status === 'NOT_ELIGIBLE') return 'NOT_ELIGIBLE';
  if (match.eligibility.status === 'INFORMATION_REQUIRED') return 'LIMITED';
  if (match.confidence === 'LOW' || !match.analysisId) return 'LIMITED';
  if (match.overallAlignment == null) return 'UNKNOWN';
  if (match.overallAlignment >= 0.7) return 'GOOD_MATCH';
  if (match.overallAlignment >= 0.45) return 'PARTIAL_MATCH';
  return 'LIMITED';
}

export function toProfileMatchViewModel(match: ProfileJobMatchDto): ProfileMatchViewModel {
  const overallLabel = resolveOverallLabel(match);
  const overallAlignmentPct =
    match.overallAlignment == null ? null : Math.round(match.overallAlignment * 100);

  let bannerTone: FitBannerTone = 'info';
  let bannerTitle = 'Fit analysis ready';
  let bannerBody = 'Review strengths, gaps, and required info before continuing.';
  let overallLabelText = 'Unknown';

  switch (overallLabel) {
    case 'GOOD_MATCH':
      bannerTone = 'success';
      bannerTitle = 'Your profile is a good match for this role';
      bannerBody = 'Review strengths, gaps, and required info before continuing.';
      overallLabelText = 'Good Match';
      break;
    case 'PARTIAL_MATCH':
      bannerTone = 'warning';
      bannerTitle = 'We found a partial match';
      bannerBody = 'Some requirements could not be fully verified from your profile.';
      overallLabelText = 'Partial Match';
      break;
    case 'LIMITED':
      bannerTone = 'warning';
      bannerTitle =
        match.eligibility.status === 'INFORMATION_REQUIRED'
          ? 'We need a few more details before we can fully evaluate this role'
          : 'Limited data for this match';
      bannerBody =
        match.eligibility.status === 'INFORMATION_REQUIRED'
          ? 'Complete the missing profile or Answer Vault details before we can fully evaluate this role.'
          : 'We found a partial match, but some requirements could not be fully verified.';
      overallLabelText =
        match.eligibility.status === 'INFORMATION_REQUIRED' ? 'Info required' : 'Limited Data';
      break;
    case 'NOT_ELIGIBLE':
      bannerTone = 'error';
      bannerTitle = 'Your profile does not currently meet one or more required conditions';
      bannerBody =
        'Review the blockers below. Soft skill gaps are listed separately and do not replace hard eligibility.';
      overallLabelText = 'Not Eligible';
      break;
    default:
      overallLabelText = 'Unknown';
  }

  const skillsStatus =
    match.skillsMatch.unknown.length > 0 && match.skillsMatch.matched.length === 0
      ? 'UNKNOWN'
      : match.skillsMatch.missing.length > 0
        ? 'PARTIAL'
        : match.skillsMatch.matched.length > 0
          ? 'MATCH'
          : 'UNKNOWN';

  const skillsScore =
    match.skillsMatch.unknown.length > 0 && match.skillsMatch.matched.length === 0
      ? 40
      : match.skillsMatch.matched.length + match.skillsMatch.missing.length === 0
        ? null
        : Math.round(
            (match.skillsMatch.matched.length /
              (match.skillsMatch.matched.length + match.skillsMatch.missing.length)) *
              100,
          );

  const dimensions: FitDimensionView[] = [
    {
      id: 'role',
      title: 'Role Alignment',
      description: 'How well your background fits the role',
      status: match.roleMatch.status,
      statusLabel: statusLabel(match.roleMatch.status),
      summary: firstMessage(match.roleMatch.evidence, 'Role alignment not evaluated.'),
      evidence: evidenceLines(match.roleMatch.evidence),
      score: statusScore(match.roleMatch.status),
      scoreLabel:
        statusScore(match.roleMatch.status) == null
          ? null
          : `${statusScore(match.roleMatch.status)}%`,
    },
    {
      id: 'skills',
      title: 'Skills Match',
      description: 'Overlap between job skills and confirmed profile skills',
      status: skillsStatus,
      statusLabel:
        match.skillsMatch.unknown.length > 0 && match.skillsMatch.matched.length === 0
          ? 'Not confirmed yet'
          : match.skillsMatch.missing.length > 0
            ? 'Partial Match'
            : match.skillsMatch.matched.length > 0
              ? 'Good Match'
              : 'Unknown',
      summary:
        match.skillsMatch.unknown.length > 0 && match.skillsMatch.matched.length === 0
          ? 'Skills were not confirmed from your application profile. Resume matching comes later.'
          : match.skillsMatch.missing.length > 0
            ? `Missing: ${match.skillsMatch.missing.slice(0, 4).join(', ')}`
            : 'Skills overlap looks solid from available profile data.',
      evidence: [
        ...match.skillsMatch.matched.map((s) => `Matched: ${s}`),
        ...match.skillsMatch.missing.map((s) => `Missing: ${s}`),
        ...match.skillsMatch.unknown.slice(0, 6).map((s) => `Unconfirmed: ${s}`),
      ],
      score: skillsScore,
      scoreLabel: skillsScore == null ? null : `${skillsScore}%`,
    },
    {
      id: 'experience',
      title: 'Experience Match',
      description: 'Years of experience versus the role minimum',
      status: match.experienceMatch.status,
      statusLabel: statusLabel(match.experienceMatch.status),
      summary: firstMessage(match.experienceMatch.evidence, 'Experience not evaluated.'),
      evidence: evidenceLines(match.experienceMatch.evidence),
      score: statusScore(match.experienceMatch.status),
      scoreLabel:
        statusScore(match.experienceMatch.status) == null
          ? null
          : `${statusScore(match.experienceMatch.status)}%`,
    },
    {
      id: 'location',
      title: 'Location Compatibility',
      description: 'Work region fit for this posting',
      status: match.locationMatch.status,
      statusLabel: statusLabel(match.locationMatch.status),
      summary: firstMessage(match.locationMatch.evidence, 'Location not evaluated.'),
      evidence: evidenceLines(match.locationMatch.evidence),
      score: statusScore(match.locationMatch.status),
      scoreLabel:
        statusScore(match.locationMatch.status) == null
          ? null
          : `${statusScore(match.locationMatch.status)}%`,
    },
    {
      id: 'workAuth',
      title: 'Work Authorization',
      description: 'Authorization status on file for this application',
      status: match.workAuthorizationMatch.status,
      statusLabel:
        match.workAuthorizationMatch.status === 'MATCH'
          ? 'Confirmed'
          : statusLabel(match.workAuthorizationMatch.status),
      summary: firstMessage(
        match.workAuthorizationMatch.evidence,
        'Work authorization not evaluated.',
      ),
      evidence: evidenceLines(match.workAuthorizationMatch.evidence),
      score: statusScore(match.workAuthorizationMatch.status),
      scoreLabel:
        statusScore(match.workAuthorizationMatch.status) == null
          ? null
          : `${statusScore(match.workAuthorizationMatch.status)}%`,
    },
    {
      id: 'sponsorship',
      title: 'Sponsorship',
      description: 'Visa sponsorship compatibility',
      status: match.sponsorshipMatch.status,
      statusLabel: statusLabel(match.sponsorshipMatch.status),
      summary: firstMessage(match.sponsorshipMatch.evidence, 'Sponsorship not evaluated.'),
      evidence: evidenceLines(match.sponsorshipMatch.evidence),
      score: statusScore(match.sponsorshipMatch.status),
      scoreLabel:
        match.sponsorshipMatch.status === 'NOT_APPLICABLE' ||
        (match.sponsorshipMatch.jobProvidesSponsorship === false &&
          match.sponsorshipMatch.candidateRequiresSponsorship === false)
          ? 'Not required'
          : statusScore(match.sponsorshipMatch.status) == null
            ? null
            : `${statusScore(match.sponsorshipMatch.status)}%`,
    },
  ];

  const missingInfo: FitMissingInfoView[] = match.missingInformation.map((item) => {
    const fix = resolveReadinessFixActions([
      { code: item.code, message: item.message, field: item.field, severity: 'BLOCKING' },
    ])[0];
    return {
      field: item.field,
      label: fix?.label ?? item.field ?? item.code,
      message: item.message,
      href: fix ? destinationToSetupHref(fix.destination) : null,
    };
  });

  const eligibilityChecklist = [
    {
      title: 'Work Authorization',
      status: statusLabel(match.workAuthorizationMatch.status),
      summary: firstMessage(match.workAuthorizationMatch.evidence, ''),
      blocking:
        match.workAuthorizationMatch.status === 'UNKNOWN' ||
        match.workAuthorizationMatch.status === 'NO_MATCH',
    },
    {
      title: 'Sponsorship',
      status: statusLabel(match.sponsorshipMatch.status),
      summary: firstMessage(match.sponsorshipMatch.evidence, ''),
      blocking: match.sponsorshipMatch.status === 'NO_MATCH',
    },
    {
      title: 'Minimum Experience',
      status: statusLabel(match.experienceMatch.status),
      summary: firstMessage(match.experienceMatch.evidence, ''),
      blocking:
        match.experienceMatch.status === 'GAP' || match.experienceMatch.status === 'UNKNOWN',
    },
    {
      title: 'Location',
      status: statusLabel(match.locationMatch.status),
      summary: firstMessage(match.locationMatch.evidence, ''),
      blocking:
        match.locationMatch.status === 'NO_MATCH' || match.locationMatch.status === 'UNKNOWN',
    },
  ];

  return {
    overallAlignmentPct,
    overallLabel,
    overallLabelText,
    bannerTone,
    bannerTitle,
    bannerBody,
    eligibilityStatus: match.eligibility.status,
    eligibilityLabel: statusLabel(match.eligibility.status),
    confidence: match.confidence,
    confidenceReason:
      match.confidence === 'HIGH'
        ? 'Based on available verified profile and job analysis.'
        : match.confidence === 'MEDIUM'
          ? 'Some signals are incomplete or advisory.'
          : 'Limited verified information for this application.',
    informationRequiredCount: match.missingInformation.length,
    missingInfo,
    dimensions,
    eligibilityChecklist,
    topStrengths: deriveTopStrengths(match, dimensions),
    keyGaps: deriveKeyGaps(match),
    warnings: match.warnings.filter((w) => w.code !== 'RECOMMENDATION_SCORE_CONTEXT'),
    sourcesUsed: deriveDataSources(match),
    updatedAt: match.matchedAt ?? null,
    recommendationContextPct:
      match.recommendationScoreFallback == null
        ? null
        : Math.round(match.recommendationScoreFallback * 100),
    skillsMatched: match.skillsMatch.matched,
    skillsMissing: match.skillsMatch.missing,
    skillsUnknown: match.skillsMatch.unknown,
  };
}
