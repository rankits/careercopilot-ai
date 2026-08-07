import type {
  ApplicationReadinessDto,
  ProfileJobMatchDto,
  ProfileMatchEvidenceDto,
} from '@/features/auto-apply/types/autoApply.types';
import {
  destinationToSetupHref,
  resolveReadinessFixActions,
} from '@/pages/AutoApplyPage/missingFieldNavigation';

export type FitIssueSeverity = 'HARD_BLOCKER' | 'INFORMATION_REQUIRED' | 'ADVISORY';

export type FitAlignmentLabel =
  | 'STRONG_ALIGNMENT'
  | 'GOOD_ALIGNMENT'
  | 'PARTIAL_ALIGNMENT'
  | 'LOW_ALIGNMENT'
  | 'INSUFFICIENT_DATA';

export type FitBannerTone = 'success' | 'warning' | 'error' | 'info';

export type FitDimensionId =
  | 'ROLE'
  | 'SKILLS'
  | 'EXPERIENCE'
  | 'LOCATION'
  | 'WORK_AUTHORIZATION'
  | 'SPONSORSHIP';

export interface FitIssueViewModel {
  code: string;
  title: string;
  message: string;
  severity: FitIssueSeverity;
  field?: string;
  evidence: Array<{ label: string; value: string }>;
  action?: { label: string; route: string };
  impact?: string;
}

export interface FitDimensionViewModel {
  id: FitDimensionId;
  /** Legacy lowercase id used by icons / filters. */
  legacyId: string;
  label: string;
  description: string;
  status: string;
  statusLabel: string;
  /** Real numeric score only — never synthesized from status. */
  score: number | null;
  scoreLabel: string | null;
  summary: string;
  evidence: string[];
  severity: FitIssueSeverity | null;
}

export interface FitEligibilityCheckView {
  title: string;
  status: string;
  statusLabel: string;
  jobRequirement: string;
  candidateValue: string;
  summary: string;
  evidence: string[];
  impact: string;
  actionLabel: string | null;
  actionHref: string | null;
  blocking: boolean;
  severity: FitIssueSeverity | null;
}

export interface FitViewModel {
  alignment: {
    score: number | null;
    pct: number | null;
    label: FitAlignmentLabel;
    labelText: string;
  };
  eligibility: {
    status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'INFORMATION_REQUIRED' | 'UNKNOWN';
    label: string;
  };
  confidence: {
    level: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
    explanation: string;
  };
  banner: {
    tone: FitBannerTone;
    title: string;
    body: string;
  };
  dimensions: FitDimensionViewModel[];
  hardBlockers: FitIssueViewModel[];
  informationRequired: FitIssueViewModel[];
  advisoryGaps: FitIssueViewModel[];
  confirmedStrengths: string[];
  eligibilityChecklist: FitEligibilityCheckView[];
  sources: {
    verifiedProfile: boolean;
    answerVault: boolean;
    storedJobData: boolean;
    jobPageAnalysis: boolean;
  };
  navigation: {
    canReviewResume: boolean;
    canOpenEmployerHandoff: boolean;
    handoffBlockedReasons: string[];
  };
  completedMode: boolean;
  recommendationContextPct: number | null;
  updatedAt: string | null;
  skillsMatched: string[];
  skillsMissing: string[];
  skillsUnknown: string[];
  /** Diagnostic only — never render to users. */
  diagnostics: string[];
}

/** @deprecated Prefer FitViewModel — kept for gradual migration. */
export type ProfileMatchViewModel = FitViewModel;
/** @deprecated Prefer FitDimensionViewModel */
export type FitDimensionView = FitDimensionViewModel;
/** @deprecated Prefer FitAlignmentLabel */
export type FitOverallLabel = FitAlignmentLabel;

const COMPLETED_STATUSES = new Set([
  'SUBMITTED',
  'CONFIRMATION_RECEIVED',
  'WITHDRAWN',
  'COULD_NOT_APPLY',
  'JOB_CLOSED',
]);

const HARD_BLOCKER_CODES = new Set([
  'EXPERIENCE_REQUIREMENT_NOT_MET',
  'JOB_LOCATION_REQUIREMENT_NOT_MET',
  'SPONSORSHIP_JOB_REQUIREMENT_NOT_MET',
  'WORK_AUTHORIZATION_INCOMPATIBLE',
  'WORK_AUTHORIZATION_NOT_MET',
]);

const INFORMATION_REQUIRED_CODES = new Set([
  'WORK_AUTHORIZATION_MISSING',
  'WORK_AUTH_MISSING',
  'WORK_REGION_VERIFICATION_REQUIRED',
  'SPONSORSHIP_UNKNOWN',
  'EXPERIENCE_REQUIREMENT_UNKNOWN',
  'EXPERIENCE_NOT_EXTRACTED',
  'DESIRED_ROLES_MISSING',
  'JOB_TITLE_MISSING',
]);

export interface FitViewModelInput {
  profileMatch: ProfileJobMatchDto;
  handoffReadiness?: ApplicationReadinessDto | null;
  applicationStatus?: string | null;
  viewState?: string | null;
}

function firstMessage(evidence: ProfileMatchEvidenceDto[] | undefined, fallback: string): string {
  return evidence?.[0]?.message ?? fallback;
}

function evidenceLines(evidence: ProfileMatchEvidenceDto[] | undefined): string[] {
  return (evidence ?? []).map((item) => item.message).filter(Boolean);
}

function humanizeCode(code: string): string {
  return code
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatJobRequirement(value: unknown): string {
  if (value == null) return 'Not specified';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return 'See job posting';
  }
}

/**
 * Authoritative classification for profile-match issues.
 * Prefer stable codes / structured kinds over display text.
 */
export function classifyProfileMatchIssue(input: {
  code: string;
  kind: 'blocker' | 'missing' | 'warning' | 'skill_unknown' | 'skill_missing' | 'role' | 'dimension';
  dimensionStatus?: string;
}): FitIssueSeverity {
  const code = input.code.toUpperCase();

  if (input.kind === 'blocker' || HARD_BLOCKER_CODES.has(code)) {
    return 'HARD_BLOCKER';
  }

  if (input.kind === 'missing' || INFORMATION_REQUIRED_CODES.has(code)) {
    return 'INFORMATION_REQUIRED';
  }

  if (input.kind === 'skill_unknown') {
    return 'ADVISORY';
  }

  if (input.kind === 'skill_missing') {
    return 'ADVISORY';
  }

  if (input.kind === 'role') {
    return 'ADVISORY';
  }

  if (
    input.kind === 'dimension' &&
    (input.dimensionStatus === 'NO_MATCH' || input.dimensionStatus === 'GAP')
  ) {
    return 'HARD_BLOCKER';
  }

  if (input.kind === 'dimension' && input.dimensionStatus === 'UNKNOWN') {
    return 'INFORMATION_REQUIRED';
  }

  if (
    code === 'RECOMMENDATION_SCORE_CONTEXT' ||
    code === 'SKILLS_PROFILE_NOT_AVAILABLE' ||
    code === 'ANALYSIS_UNAVAILABLE' ||
    code === 'ANALYSIS_STALE' ||
    code === 'ROLE_NO_MATCH' ||
    code === 'ROLE_PARTIAL' ||
    code === 'SPONSORSHIP_UNKNOWN_COMPATIBILITY'
  ) {
    return 'ADVISORY';
  }

  return 'ADVISORY';
}

function issueAction(item: ProfileMatchEvidenceDto): FitIssueViewModel['action'] | undefined {
  const fix = resolveReadinessFixActions([
    { code: item.code, message: item.message, field: item.field, severity: 'BLOCKING' },
  ])[0];
  if (!fix) return undefined;
  const route = destinationToSetupHref(fix.destination);
  if (!route) return undefined;
  return {
    label: fix.label,
    route,
  };
}

function toIssue(
  item: ProfileMatchEvidenceDto,
  severity: FitIssueSeverity,
  extras?: Partial<FitIssueViewModel>,
): FitIssueViewModel {
  return {
    code: item.code,
    title: extras?.title ?? humanizeCode(item.code),
    message: item.message,
    severity,
    field: item.field,
    evidence: extras?.evidence ?? [],
    action: extras?.action ?? issueAction(item),
    impact: extras?.impact,
  };
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

function deriveDataSources(match: ProfileJobMatchDto): FitViewModel['sources'] {
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

export function resolveAlignmentLabel(match: ProfileJobMatchDto): FitAlignmentLabel {
  if (match.overallAlignment == null) return 'INSUFFICIENT_DATA';
  if (match.overallAlignment >= 0.85) return 'STRONG_ALIGNMENT';
  if (match.overallAlignment >= 0.7) return 'GOOD_ALIGNMENT';
  if (match.overallAlignment >= 0.45) return 'PARTIAL_ALIGNMENT';
  return 'LOW_ALIGNMENT';
}

function alignmentLabelText(label: FitAlignmentLabel): string {
  switch (label) {
    case 'STRONG_ALIGNMENT':
      return 'Strong alignment';
    case 'GOOD_ALIGNMENT':
      return 'Good alignment';
    case 'PARTIAL_ALIGNMENT':
      return 'Partial alignment';
    case 'LOW_ALIGNMENT':
      return 'Low alignment';
    default:
      return 'Insufficient data';
  }
}

function dimensionStatusLabel(id: FitDimensionId, status: string, match: ProfileJobMatchDto): string {
  if (id === 'SKILLS') {
    if (match.skillsMatch.matched.length > 0 && match.skillsMatch.unknown.length === 0) {
      return 'Confirmed';
    }
    if (match.skillsMatch.unknown.length > 0) return 'Not confirmed';
    return 'Needs verification';
  }
  if (id === 'WORK_AUTHORIZATION') {
    if (status === 'MATCH') return 'Confirmed';
    if (status === 'UNKNOWN') return 'Not verified';
    if (status === 'NO_MATCH') return 'Incompatible';
  }
  if (id === 'SPONSORSHIP') {
    if (status === 'NOT_APPLICABLE') return 'Not required';
    if (status === 'MATCH') return 'Compatible';
    if (status === 'NO_MATCH') return 'Unavailable';
    if (status === 'UNKNOWN') return 'Unknown';
  }
  if (id === 'LOCATION') {
    if (status === 'MATCH') return 'Compatible';
    if (status === 'NO_MATCH') return 'Incompatible';
    if (status === 'UNKNOWN') return 'Not confirmed';
    if (status === 'NOT_APPLICABLE') return 'Not restricted';
  }
  if (id === 'EXPERIENCE') {
    if (status === 'MATCH') return 'Meets requirement';
    if (status === 'GAP') return 'Below requirement';
    if (status === 'UNKNOWN') return 'Not confirmed';
  }
  if (id === 'ROLE') {
    if (status === 'MATCH') return 'Strong';
    if (status === 'PARTIAL') return 'Partial';
    if (status === 'NO_MATCH') return 'Low';
    return 'Unknown';
  }
  return status.replaceAll('_', ' ');
}

function dimensionSeverity(
  id: FitDimensionId,
  status: string,
): FitIssueSeverity | null {
  if (id === 'SKILLS') {
    return status === 'UNKNOWN' ? 'ADVISORY' : null;
  }
  if (id === 'ROLE') {
    if (status === 'NO_MATCH' || status === 'PARTIAL') return 'ADVISORY';
    return null;
  }
  if (status === 'NO_MATCH' || status === 'GAP') return 'HARD_BLOCKER';
  if (status === 'UNKNOWN') return 'INFORMATION_REQUIRED';
  return null;
}

function buildBanner(match: ProfileJobMatchDto): FitViewModel['banner'] {
  switch (match.eligibility.status) {
    case 'ELIGIBLE':
      return {
        tone: 'success',
        title: 'Your profile meets the confirmed eligibility requirements for this role.',
        body: 'Review alignment details, then continue to resume review when you are ready.',
      };
    case 'INFORMATION_REQUIRED':
      return {
        tone: 'warning',
        title: 'We need more information before eligibility can be confirmed.',
        body: 'You can still review your resume. Employer handoff stays blocked until mandatory facts are resolved.',
      };
    case 'NOT_ELIGIBLE':
      return {
        tone: 'error',
        title: 'Not eligible due to a hard blocker.',
        body: 'Your profile does not currently meet one or more required conditions for this role. You can still review your resume and update your profile or answers. Employer handoff will remain blocked until mandatory conditions are resolved.',
      };
    default:
      return {
        tone: 'info',
        title: 'Fit analysis ready',
        body: 'Review strengths, gaps, and required info before continuing.',
      };
  }
}

function deriveStrengths(match: ProfileJobMatchDto): string[] {
  if (match.topStrengths && match.topStrengths.length > 0) {
    return match.topStrengths.slice(0, 8);
  }
  const strengths: string[] = [];
  const push = (line: string) => {
    if (line && !strengths.includes(line)) strengths.push(line);
  };
  if (match.experienceMatch.status === 'MATCH') {
    push(firstMessage(match.experienceMatch.evidence, 'Meets experience requirement'));
  }
  if (match.workAuthorizationMatch.status === 'MATCH') {
    push(firstMessage(match.workAuthorizationMatch.evidence, 'Work authorization confirmed'));
  }
  if (
    match.sponsorshipMatch.status === 'NOT_APPLICABLE' ||
    match.sponsorshipMatch.status === 'MATCH'
  ) {
    push(firstMessage(match.sponsorshipMatch.evidence, 'Sponsorship not required'));
  }
  if (match.locationMatch.status === 'MATCH') {
    push(firstMessage(match.locationMatch.evidence, 'Location compatible'));
  }
  if (match.roleMatch.status === 'MATCH' || match.roleMatch.status === 'PARTIAL') {
    push(firstMessage(match.roleMatch.evidence, 'Role alignment looks solid'));
  }
  for (const skill of match.skillsMatch.matched) {
    push(`Confirmed skill: ${skill}`);
  }
  return strengths.slice(0, 8);
}

function buildDimensions(match: ProfileJobMatchDto): FitDimensionViewModel[] {
  const skillsStatus =
    match.skillsMatch.matched.length > 0 && match.skillsMatch.unknown.length === 0
      ? 'MATCH'
      : match.skillsMatch.matched.length > 0
        ? 'PARTIAL'
        : 'UNKNOWN';

  const skillsSummary =
    skillsStatus === 'UNKNOWN'
      ? 'We could not confirm these skills from your verified application profile. Resume-based matching happens in the next step.'
      : match.skillsMatch.matched.length > 0
        ? `Confirmed from profile: ${match.skillsMatch.matched.slice(0, 4).join(', ')}`
        : 'Skills evidence is limited on your verified application profile.';

  const defs: Array<{
    id: FitDimensionId;
    legacyId: string;
    label: string;
    description: string;
    status: string;
    summary: string;
    evidence: string[];
  }> = [
    {
      id: 'ROLE',
      legacyId: 'role',
      label: 'Role alignment',
      description: 'How closely your preferred roles resemble this posting',
      status: match.roleMatch.status,
      summary: firstMessage(match.roleMatch.evidence, 'Role alignment not evaluated.'),
      evidence: evidenceLines(match.roleMatch.evidence),
    },
    {
      id: 'SKILLS',
      legacyId: 'skills',
      label: 'Skills evidence',
      description: 'Skills confirmed from your verified application profile',
      status: skillsStatus,
      summary: skillsSummary,
      evidence: [
        ...match.skillsMatch.matched.map((s) => `Confirmed: ${s}`),
        ...match.skillsMatch.unknown.slice(0, 8).map((s) => `Not confirmed: ${s}`),
        ...(match.skillsMatch.unknown.length > 0
          ? ['Checked in Resume step — resume content is not used here.']
          : []),
      ],
    },
    {
      id: 'EXPERIENCE',
      legacyId: 'experience',
      label: 'Experience',
      description: 'Years of experience versus the role minimum',
      status: match.experienceMatch.status,
      summary: firstMessage(match.experienceMatch.evidence, 'Experience not evaluated.'),
      evidence: evidenceLines(match.experienceMatch.evidence),
    },
    {
      id: 'LOCATION',
      legacyId: 'location',
      label: 'Location',
      description: 'Work region fit for this posting',
      status: match.locationMatch.status,
      summary: firstMessage(match.locationMatch.evidence, 'Location not evaluated.'),
      evidence: evidenceLines(match.locationMatch.evidence),
    },
    {
      id: 'WORK_AUTHORIZATION',
      legacyId: 'workAuth',
      label: 'Work authorization',
      description: 'Authorization status on file for this application',
      status: match.workAuthorizationMatch.status,
      summary: firstMessage(
        match.workAuthorizationMatch.evidence,
        'Work authorization not evaluated.',
      ),
      evidence: evidenceLines(match.workAuthorizationMatch.evidence),
    },
    {
      id: 'SPONSORSHIP',
      legacyId: 'sponsorship',
      label: 'Sponsorship',
      description: 'Visa sponsorship compatibility',
      status: match.sponsorshipMatch.status,
      summary: firstMessage(match.sponsorshipMatch.evidence, 'Sponsorship not evaluated.'),
      evidence: evidenceLines(match.sponsorshipMatch.evidence),
    },
  ];

  return defs.map((dim) => {
    const statusLabel = dimensionStatusLabel(dim.id, dim.status, match);
    return {
      id: dim.id,
      legacyId: dim.legacyId,
      label: dim.label,
      description: dim.description,
      status: dim.status,
      statusLabel,
      score: null,
      scoreLabel: null,
      summary: dim.summary,
      evidence: dim.evidence,
      severity: dimensionSeverity(dim.id, dim.status),
    };
  });
}

function buildEligibilityChecklist(match: ProfileJobMatchDto): FitEligibilityCheckView[] {
  const authStatus = match.workAuthorizationMatch.status;
  const sponsorStatus = match.sponsorshipMatch.status;
  const expStatus = match.experienceMatch.status;
  const locStatus = match.locationMatch.status;

  const rows: FitEligibilityCheckView[] = [
    {
      title: 'Work Authorization',
      status: authStatus,
      statusLabel: dimensionStatusLabel('WORK_AUTHORIZATION', authStatus, match),
      jobRequirement: 'Must satisfy work-authorization requirements for this role',
      candidateValue: match.workAuthorizationMatch.candidateAnswer ?? 'Not provided',
      summary: firstMessage(match.workAuthorizationMatch.evidence, ''),
      evidence: evidenceLines(match.workAuthorizationMatch.evidence),
      impact:
        authStatus === 'NO_MATCH'
          ? 'Blocks employer handoff.'
          : authStatus === 'UNKNOWN'
            ? 'Must be confirmed before employer handoff.'
            : 'Does not block handoff.',
      actionLabel: authStatus === 'UNKNOWN' || authStatus === 'NO_MATCH' ? 'Update answers' : null,
      actionHref:
        authStatus === 'UNKNOWN' || authStatus === 'NO_MATCH'
          ? destinationToSetupHref({
              kind: 'section',
              sectionId: 'work-auth',
              fieldId: 'work_authorization',
            })
          : null,
      blocking: authStatus === 'NO_MATCH' || authStatus === 'UNKNOWN',
      severity: dimensionSeverity('WORK_AUTHORIZATION', authStatus),
    },
    {
      title: 'Sponsorship',
      status: sponsorStatus,
      statusLabel: dimensionStatusLabel('SPONSORSHIP', sponsorStatus, match),
      jobRequirement:
        match.sponsorshipMatch.jobProvidesSponsorship == null
          ? 'See job posting'
          : match.sponsorshipMatch.jobProvidesSponsorship
            ? 'Sponsorship may be available'
            : 'Sponsorship not offered',
      candidateValue:
        match.sponsorshipMatch.candidateRequiresSponsorship == null
          ? 'Not provided'
          : match.sponsorshipMatch.candidateRequiresSponsorship
            ? 'Requires sponsorship'
            : 'Does not require sponsorship',
      summary: firstMessage(match.sponsorshipMatch.evidence, ''),
      evidence: evidenceLines(match.sponsorshipMatch.evidence),
      impact:
        sponsorStatus === 'NO_MATCH'
          ? 'Blocks employer handoff.'
          : sponsorStatus === 'UNKNOWN'
            ? 'Must be confirmed before employer handoff.'
            : 'Does not block handoff.',
      actionLabel:
        sponsorStatus === 'NO_MATCH' || sponsorStatus === 'UNKNOWN' ? 'Update answers' : null,
      actionHref:
        sponsorStatus === 'NO_MATCH' || sponsorStatus === 'UNKNOWN'
          ? destinationToSetupHref({
              kind: 'section',
              sectionId: 'work-auth',
              fieldId: 'requiresSponsorship',
            })
          : null,
      blocking: sponsorStatus === 'NO_MATCH' || sponsorStatus === 'UNKNOWN',
      severity: dimensionSeverity('SPONSORSHIP', sponsorStatus),
    },
    {
      title: 'Minimum Experience',
      status: expStatus,
      statusLabel: dimensionStatusLabel('EXPERIENCE', expStatus, match),
      jobRequirement:
        match.experienceMatch.requiredYears == null
          ? 'Not extracted'
          : `${match.experienceMatch.requiredYears}+ years`,
      candidateValue:
        match.experienceMatch.candidateYears == null
          ? 'Not provided'
          : `${match.experienceMatch.candidateYears} years`,
      summary: firstMessage(match.experienceMatch.evidence, ''),
      evidence: evidenceLines(match.experienceMatch.evidence),
      impact:
        expStatus === 'GAP'
          ? 'Blocks employer handoff.'
          : expStatus === 'UNKNOWN'
            ? 'Must be confirmed before employer handoff.'
            : 'Does not block handoff.',
      actionLabel: expStatus === 'GAP' || expStatus === 'UNKNOWN' ? 'Update profile' : null,
      actionHref:
        expStatus === 'GAP' || expStatus === 'UNKNOWN'
          ? destinationToSetupHref({
              kind: 'section',
              sectionId: 'answers',
              fieldId: 'years_of_experience',
            })
          : null,
      blocking: expStatus === 'GAP' || expStatus === 'UNKNOWN',
      severity: dimensionSeverity('EXPERIENCE', expStatus),
    },
    {
      title: 'Location / Region',
      status: locStatus,
      statusLabel: dimensionStatusLabel('LOCATION', locStatus, match),
      jobRequirement: formatJobRequirement(match.locationMatch.jobRequirement),
      candidateValue: match.locationMatch.candidateRegion ?? 'Not provided',
      summary: firstMessage(match.locationMatch.evidence, ''),
      evidence: evidenceLines(match.locationMatch.evidence),
      impact:
        locStatus === 'NO_MATCH'
          ? 'Blocks employer handoff.'
          : locStatus === 'UNKNOWN'
            ? 'Must be confirmed before employer handoff.'
            : 'Does not block handoff.',
      actionLabel:
        locStatus === 'NO_MATCH' || locStatus === 'UNKNOWN' ? 'Update location preference' : null,
      actionHref:
        locStatus === 'NO_MATCH' || locStatus === 'UNKNOWN'
          ? destinationToSetupHref({
              kind: 'section',
              sectionId: 'preferences',
              fieldId: 'preferredLocations',
            })
          : null,
      blocking: locStatus === 'NO_MATCH' || locStatus === 'UNKNOWN',
      severity: dimensionSeverity('LOCATION', locStatus),
    },
  ];

  return rows;
}

function classifyIssues(match: ProfileJobMatchDto): {
  hardBlockers: FitIssueViewModel[];
  informationRequired: FitIssueViewModel[];
  advisoryGaps: FitIssueViewModel[];
} {
  const hardBlockers: FitIssueViewModel[] = [];
  const informationRequired: FitIssueViewModel[] = [];
  const advisoryGaps: FitIssueViewModel[] = [];

  const push = (issue: FitIssueViewModel) => {
    if (issue.severity === 'HARD_BLOCKER') hardBlockers.push(issue);
    else if (issue.severity === 'INFORMATION_REQUIRED') informationRequired.push(issue);
    else advisoryGaps.push(issue);
  };

  for (const blocker of match.eligibility.blockers) {
    const severity = classifyProfileMatchIssue({ code: blocker.code, kind: 'blocker' });
    push(
      toIssue(blocker, severity, {
        title: humanizeCode(blocker.code),
        impact: 'Blocks employer handoff.',
        evidence: [
          { label: 'Detail', value: blocker.message },
          ...(blocker.field ? [{ label: 'Field', value: blocker.field }] : []),
        ],
      }),
    );
  }

  for (const missing of match.missingInformation) {
    const severity = classifyProfileMatchIssue({ code: missing.code, kind: 'missing' });
    push(
      toIssue(missing, severity, {
        title: humanizeCode(missing.code),
        impact: 'Resolve before employer handoff.',
        evidence: [{ label: 'Detail', value: missing.message }],
      }),
    );
  }

  for (const warning of match.warnings) {
    if (
      warning.code === 'RECOMMENDATION_SCORE_CONTEXT' ||
      warning.code === 'SKILLS_PROFILE_NOT_AVAILABLE'
    ) {
      continue;
    }
    const severity = classifyProfileMatchIssue({ code: warning.code, kind: 'warning' });
    push(
      toIssue(warning, severity, {
        title: humanizeCode(warning.code),
        impact: 'Advisory only — does not block resume or handoff.',
      }),
    );
  }

  if (match.roleMatch.status === 'NO_MATCH' || match.roleMatch.status === 'PARTIAL') {
    const code = match.roleMatch.evidence[0]?.code ?? 'ROLE_ALIGNMENT';
    push({
      code,
      title: 'Role alignment',
      message: firstMessage(
        match.roleMatch.evidence,
        'Preferred roles differ from this posting.',
      ),
      severity: 'ADVISORY',
      evidence: evidenceLines(match.roleMatch.evidence).map((value) => ({
        label: 'Evidence',
        value,
      })),
      impact: 'Advisory only — does not block resume or handoff.',
    });
  }

  // Unknown skills are never confirmed gaps / hard blockers.
  for (const skill of match.skillsMatch.unknown.slice(0, 6)) {
    push({
      code: 'SKILL_NOT_CONFIRMED',
      title: `${skill} not confirmed`,
      message:
        'We could not confirm this skill from your verified application profile. Resume-based matching happens in the next step.',
      severity: 'ADVISORY',
      evidence: [{ label: 'Skill', value: skill }],
      impact: 'Advisory — checked in Resume step.',
    });
  }

  // Soft "missing" skill labels from backend are advisory, not confirmed weaknesses.
  for (const skill of match.skillsMatch.missing.slice(0, 4)) {
    push({
      code: 'SKILL_NOT_ON_PROFILE',
      title: `${skill} not on profile`,
      message: 'This skill was not found on your verified application profile.',
      severity: 'ADVISORY',
      evidence: [{ label: 'Skill', value: skill }],
      impact: 'Advisory — does not block resume or handoff.',
    });
  }

  return { hardBlockers, informationRequired, advisoryGaps };
}

function buildNavigation(
  readiness: ApplicationReadinessDto | null | undefined,
  completedMode: boolean,
): FitViewModel['navigation'] {
  const blocking = readiness?.blockingReasons ?? [];
  const handoffBlockedReasons = blocking.map((r) => r.message || r.code).filter(Boolean);
  return {
    canReviewResume: true,
    canOpenEmployerHandoff: !completedMode && readiness?.ready === true,
    handoffBlockedReasons,
  };
}

function buildDiagnostics(
  match: ProfileJobMatchDto,
  readiness: ApplicationReadinessDto | null | undefined,
  applicationStatus: string | null | undefined,
): string[] {
  const diagnostics: string[] = [];
  if (
    match.eligibility.status === 'NOT_ELIGIBLE' &&
    (applicationStatus === 'READY_FOR_REVIEW' || applicationStatus === 'ACTION_REQUIRED')
  ) {
    diagnostics.push(
      `profileMatch eligibility=NOT_ELIGIBLE but lifecycle status=${applicationStatus}`,
    );
  }
  if (match.eligibility.status === 'ELIGIBLE' && readiness && readiness.ready === false) {
    diagnostics.push('profileMatch eligibility=ELIGIBLE but HANDOFF readiness is blocked');
  }
  return diagnostics;
}

export function toFitViewModel(input: FitViewModelInput): FitViewModel {
  const { profileMatch: match, handoffReadiness, applicationStatus, viewState } = input;
  const alignmentLabel = resolveAlignmentLabel(match);
  const alignmentPct =
    match.overallAlignment == null ? null : Math.round(match.overallAlignment * 100);
  const completedMode =
    Boolean(applicationStatus && COMPLETED_STATUSES.has(applicationStatus)) ||
    viewState === 'APPLIED' ||
    viewState === 'ABANDONED' ||
    viewState === 'FAILED';

  const dimensions = buildDimensions(match);
  const { hardBlockers, informationRequired, advisoryGaps } = classifyIssues(match);
  const navigation = buildNavigation(handoffReadiness, completedMode);
  const diagnostics = buildDiagnostics(match, handoffReadiness, applicationStatus);

  if (diagnostics.length > 0 && typeof console !== 'undefined') {
    // Internal only — never shown in UI.
    console.warn('[FitViewModel] lifecycle/match discrepancy', diagnostics);
  }

  return {
    alignment: {
      score: match.overallAlignment,
      pct: alignmentPct,
      label: alignmentLabel,
      labelText: alignmentLabelText(alignmentLabel),
    },
    eligibility: {
      status: match.eligibility.status,
      label:
        match.eligibility.status === 'ELIGIBLE'
          ? 'Eligible'
          : match.eligibility.status === 'NOT_ELIGIBLE'
            ? 'Not eligible'
            : match.eligibility.status === 'INFORMATION_REQUIRED'
              ? 'Information required'
              : 'Unknown',
    },
    confidence: {
      level: match.confidence,
      explanation:
        match.confidence === 'HIGH'
          ? 'Based on available verified profile and job analysis.'
          : match.confidence === 'MEDIUM'
            ? 'Some signals are incomplete or advisory.'
            : 'Limited verified information for this application.',
    },
    banner: buildBanner(match),
    dimensions,
    hardBlockers,
    informationRequired,
    advisoryGaps,
    confirmedStrengths: deriveStrengths(match),
    eligibilityChecklist: buildEligibilityChecklist(match),
    sources: deriveDataSources(match),
    navigation,
    completedMode,
    recommendationContextPct:
      match.recommendationScoreFallback == null
        ? null
        : Math.round(match.recommendationScoreFallback * 100),
    updatedAt: match.matchedAt ?? null,
    skillsMatched: match.skillsMatch.matched,
    skillsMissing: match.skillsMatch.missing,
    skillsUnknown: match.skillsMatch.unknown,
    diagnostics,
  };
}

/** Convenience mapper when only the persisted match is available. */
export function toProfileMatchViewModel(
  match: ProfileJobMatchDto,
  options?: Omit<FitViewModelInput, 'profileMatch'>,
): FitViewModel {
  return toFitViewModel({ profileMatch: match, ...options });
}

/** @deprecated Use resolveAlignmentLabel — eligibility no longer drives alignment label. */
export function resolveOverallLabel(match: ProfileJobMatchDto): FitAlignmentLabel {
  return resolveAlignmentLabel(match);
}
