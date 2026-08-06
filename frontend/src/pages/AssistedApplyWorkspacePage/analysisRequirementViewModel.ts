import type { ApplicationPageRequirementDto } from '@/features/auto-apply/types/autoApply.types';

export type RequirementIconId =
  'region' | 'experience' | 'mobile' | 'auth' | 'sponsorship' | 'skills' | 'generic';

export type RequirementReviewTone = 'success' | 'warning' | 'neutral';

export interface RequirementDetailRow {
  label: string;
  value: string;
}

export interface RequirementViewModel {
  code: string;
  title: string;
  iconId: RequirementIconId;
  operatorLabel: string;
  valueLabel: string;
  evidence: string;
  requiredLabel: string;
  required: boolean;
  confidencePercent: number | null;
  sourceLabel: string;
  reviewLabel?: string;
  reviewTone?: RequirementReviewTone;
  extractionMethodLabel?: string;
  details: RequirementDetailRow[];
}

function humanizeToken(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function titleForCode(code: string): string {
  switch (code) {
    case 'WORK_REGION':
      return 'Work Region';
    case 'TOTAL_EXPERIENCE_YEARS':
      return 'Total Experience Years';
    case 'MOBILE_DESIGN_EXPERIENCE':
      return 'Mobile Design Experience';
    case 'WORK_AUTHORIZATION':
      return 'Work Authorization';
    case 'SPONSORSHIP':
      return 'Sponsorship';
    default:
      return humanizeToken(code);
  }
}

function iconForCode(code: string): RequirementIconId {
  switch (code) {
    case 'WORK_REGION':
      return 'region';
    case 'TOTAL_EXPERIENCE_YEARS':
      return 'experience';
    case 'MOBILE_DESIGN_EXPERIENCE':
      return 'mobile';
    case 'WORK_AUTHORIZATION':
      return 'auth';
    case 'SPONSORSHIP':
      return 'sponsorship';
    default:
      if (code.includes('SKILL')) return 'skills';
      return 'generic';
  }
}

function operatorLabel(operator?: string, assertion?: string): string {
  const source = assertion || operator;
  if (!source) return 'requires';
  switch (source.toUpperCase()) {
    case 'REQUIRES':
    case 'REQUIRED':
    case 'GTE':
    case 'IN':
    case 'EQ':
      return 'requires';
    case 'ALLOWS':
      return 'allows';
    case 'DOES_NOT_ALLOW':
      return 'does not allow';
    case 'PROVIDES':
      return 'provides';
    case 'DOES_NOT_PROVIDE':
      return 'does not provide';
    case 'LTE':
      return 'at most';
    default:
      return humanizeToken(source).toLowerCase();
  }
}

function formatRegionValue(req: ApplicationPageRequirementDto): string {
  const geo = req.geographic;
  if (geo?.rawValue?.trim()) return geo.rawValue.trim();
  if (geo?.normalizedRegion) return humanizeToken(geo.normalizedRegion);
  if (Array.isArray(req.value)) {
    return req.value.map((item) => humanizeToken(String(item))).join(', ');
  }
  if (typeof req.value === 'string') return humanizeToken(req.value);
  return 'Region specified';
}

function formatValueLabel(req: ApplicationPageRequirementDto): string {
  switch (req.code) {
    case 'WORK_REGION':
      return formatRegionValue(req);
    case 'TOTAL_EXPERIENCE_YEARS': {
      const years = typeof req.value === 'number' ? req.value : Number(req.value);
      if (Number.isFinite(years)) {
        return req.operator === 'GTE' || !req.operator ? `${years}+ years` : `${years} years`;
      }
      return req.sourceText?.trim() || 'Experience required';
    }
    case 'MOBILE_DESIGN_EXPERIENCE':
      if (req.value === true || req.operator === 'REQUIRED' || req.required) return 'Required';
      if (req.value === false) return 'Not required';
      return req.sourceText?.trim() || 'Required';
    default: {
      if (typeof req.value === 'boolean') return req.value ? 'Required' : 'Not required';
      if (typeof req.value === 'number') return String(req.value);
      if (Array.isArray(req.value)) {
        return req.value.map((item) => humanizeToken(String(item))).join(', ');
      }
      if (typeof req.value === 'string' && req.value.trim()) return humanizeToken(req.value);
      return req.required ? 'Required' : 'Specified';
    }
  }
}

function reviewMeta(status?: string): { label?: string; tone?: RequirementReviewTone } {
  if (!status) return {};
  switch (status.toUpperCase()) {
    case 'REVIEW_REQUIRED':
      return { label: 'Review required', tone: 'warning' };
    case 'AUTO_ACCEPTED':
      return { label: 'Accepted', tone: 'success' };
    case 'USER_CONFIRMED':
      return { label: 'Confirmed', tone: 'success' };
    case 'REJECTED':
      return { label: 'Rejected', tone: 'warning' };
    default:
      return { label: humanizeToken(status), tone: 'neutral' };
  }
}

function evidenceStrengthLabel(value?: string): string {
  if (!value) return '—';
  switch (value.toUpperCase()) {
    case 'AUTHORITATIVE_STRUCTURED':
      return 'Authoritative structured';
    case 'EXPLICIT_TEXT':
      return 'Explicit text';
    case 'STRONG_INFERENCE':
      return 'Strong inference';
    case 'WEAK_INFERENCE':
      return 'Weak inference';
    default:
      return humanizeToken(value);
  }
}

function extractionMethodLabel(value?: string): string | undefined {
  if (!value) return undefined;
  switch (value.toUpperCase()) {
    case 'DOM_RULE':
      return 'DOM rule';
    case 'STRUCTURED_DATA':
      return 'Structured data';
    case 'PROVIDER_API':
      return 'Provider API';
    case 'AI_EXTRACTION':
      return 'AI extraction';
    case 'USER_CONFIRMED':
      return 'User confirmed';
    default:
      return humanizeToken(value);
  }
}

function importanceLabel(value?: string, required?: boolean): string {
  if (value) return humanizeToken(value);
  return required ? 'Required' : 'Optional';
}

function assertionLabel(value?: string): string {
  if (!value) return '—';
  return humanizeToken(value);
}

export function mapRequirementToViewModel(
  requirement: ApplicationPageRequirementDto,
): RequirementViewModel {
  const review = reviewMeta(requirement.reviewStatus);
  const required = Boolean(
    requirement.required ||
    requirement.importance === 'REQUIRED' ||
    requirement.assertion === 'REQUIRES',
  );
  const confidencePercent =
    typeof requirement.confidence === 'number' && Number.isFinite(requirement.confidence)
      ? Math.round(requirement.confidence * 100)
      : null;

  const details: RequirementDetailRow[] = [
    { label: 'Requirement code', value: requirement.code },
    { label: 'Operator', value: requirement.operator ?? '—' },
    { label: 'Assertion', value: assertionLabel(requirement.assertion) },
    { label: 'Importance', value: importanceLabel(requirement.importance, required) },
    {
      label: 'Review status',
      value: review.label ?? humanizeToken(requirement.reviewStatus ?? '—'),
    },
    { label: 'Evidence strength', value: evidenceStrengthLabel(requirement.evidenceStrength) },
    {
      label: 'Extraction method',
      value: extractionMethodLabel(requirement.extractionMethod) || '—',
    },
  ];

  if (requirement.sourceUrl) {
    details.push({ label: 'Source URL', value: requirement.sourceUrl });
  }

  const rawValue =
    requirement.value === undefined || requirement.value === null
      ? '—'
      : typeof requirement.value === 'string'
        ? requirement.value
        : JSON.stringify(requirement.value);
  details.push({ label: 'Raw normalized value', value: rawValue });

  if (requirement.geographic?.interpretationStatus) {
    details.push({
      label: 'Geographic interpretation',
      value: humanizeToken(requirement.geographic.interpretationStatus),
    });
  }

  return {
    code: requirement.code,
    title: titleForCode(requirement.code),
    iconId: iconForCode(requirement.code),
    operatorLabel: operatorLabel(requirement.operator, requirement.assertion),
    valueLabel: formatValueLabel(requirement),
    evidence: requirement.sourceText?.trim() || 'No quote extracted from the posting.',
    requiredLabel: required ? 'Required' : 'Optional',
    required,
    confidencePercent,
    sourceLabel: 'Job description',
    reviewLabel: review.label,
    reviewTone: review.tone,
    extractionMethodLabel: extractionMethodLabel(requirement.extractionMethod),
    details,
  };
}

export function averageRequirementConfidencePercent(
  requirements: ApplicationPageRequirementDto[],
): number | null {
  if (requirements.length === 0) return null;
  const scores = requirements
    .map((item) => item.confidence)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (scores.length === 0) return null;
  const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return Math.round(avg * 100);
}

export function humanizeEnumLabel(value: string | undefined | null): string {
  if (!value) return '—';
  return humanizeToken(value);
}

export function providerDisplayLabel(provider: string | undefined): string {
  if (!provider || provider === 'UNKNOWN') return 'Unknown provider';
  return humanizeToken(provider);
}

export function submissionCapabilityLabel(capability: string | undefined): string {
  if (!capability) return '—';
  if (capability === 'EXTERNAL_MANUAL') return 'External manual';
  return humanizeToken(capability);
}

export function formStatusLabel(status: string | undefined): string {
  if (!status) return '—';
  if (status === 'NOT_INSPECTED') return 'Not inspected';
  return humanizeToken(status);
}

export function analysisStatusLabel(status: string | undefined): string {
  if (!status) return '—';
  return humanizeToken(status);
}

export function extractorVersionLabel(version: string | undefined): string {
  if (!version) return '—';
  if (version.toLowerCase() === 'deterministic-v2') return 'Deterministic v2';
  return humanizeToken(version.replace(/-/g, ' '));
}

export function formatLocalDateTime(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatAnalyzedClock(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function expiresInDaysLabel(expiresAt: string | undefined, now = new Date()): string {
  if (!expiresAt) return '';
  const expires = new Date(expiresAt);
  if (Number.isNaN(expires.getTime())) return '';
  const days = Math.max(0, Math.round((expires.getTime() - now.getTime()) / 86_400_000));
  return `${days} day${days === 1 ? '' : 's'}`;
}
