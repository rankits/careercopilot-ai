export type RequirementDomain =
  'RESUME_EVIDENCE' | 'CANDIDATE_ELIGIBILITY' | 'APPLICATION_FORM' | 'UNKNOWN';

export const REQUIREMENT_CLASSIFIER_VERSION = 'req-domain-v1';

const ELIGIBILITY_CODES = new Set([
  'WORK_REGION',
  'WORK_AUTHORIZATION',
  'WORK_AUTH',
  'SPONSORSHIP',
  'CANDIDATE_LOCATION',
  'LOCATION',
  'RELOCATION',
  'SALARY',
  'SALARY_EXPECTATIONS',
  'COMPENSATION',
  'NOTICE_PERIOD',
  'AVAILABILITY',
  'START_DATE',
  'AGE_REQUIREMENT',
  'CITIZENSHIP',
  'CLEARANCE',
  'SECURITY_CLEARANCE',
]);

const APPLICATION_FORM_CODES = new Set([
  'SUBMISSION_CAPABILITY',
  'DEMOGRAPHIC',
  'VOLUNTARY_DISCLOSURE',
  'EEO',
  'ACKNOWLEDGEMENT',
  'APPLICATION_QUESTION',
  'FORM_FIELD',
]);

const RESUME_EVIDENCE_CODES = new Set([
  'TOTAL_EXPERIENCE_YEARS',
  'YEARS_OF_EXPERIENCE',
  'EXPERIENCE',
  'MOBILE_DESIGN_EXPERIENCE',
  'PORTFOLIO',
  'EDUCATION',
  'DEGREE',
  'CERTIFICATION',
  'CERTIFICATIONS',
  'SKILL',
  'SKILLS',
  'TECHNOLOGY',
  'TECHNOLOGIES',
  'TOOL',
  'TOOLS',
  'LANGUAGE',
  'LANGUAGES',
  'LEADERSHIP',
  'DOMAIN',
  'RESPONSIBILITY',
  'RESPONSIBILITIES',
  'ACHIEVEMENT',
  'ACHIEVEMENTS',
]);

const ELIGIBILITY_HINTS =
  /\b(work\s*region|work\s*authorization|authorized\s+to\s+work|visa|sponsorship|relocat|salary|compensation|notice\s+period|availability|citizenship|security\s+clearance|must\s+be\s+based|candidates?\s+based\s+in|us[-\s]?based|location\s+requirement)\b/i;

const RESUME_HINTS =
  /\b(years?\s+of\s+experience|experience\s+with|proficien|skill|certificat|degree|bachelor|master|phd|portfolio|case\s+stud|responsib|leadership|built|designed|implemented|python|java|react|sql|machine\s+learning)\b/i;

/**
 * Classify a job-page requirement for analysis domain.
 * Only RESUME_EVIDENCE may affect Assisted Apply resume alignment.
 */
export function classifyRequirementDomain(input: {
  code: string;
  sourceText?: string | null;
  assertion?: string | null;
}): RequirementDomain {
  const code = (input.code || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (!code) return 'UNKNOWN';

  if (ELIGIBILITY_CODES.has(code)) return 'CANDIDATE_ELIGIBILITY';
  if (APPLICATION_FORM_CODES.has(code)) return 'APPLICATION_FORM';
  if (RESUME_EVIDENCE_CODES.has(code)) return 'RESUME_EVIDENCE';

  // Prefix / substring heuristics for AI-extracted codes
  if (
    /REGION|LOCATION|SPONSOR|AUTH|VISA|SALARY|COMPENSAT|NOTICE|RELOCAT|CITIZEN|CLEARANCE/.test(code)
  ) {
    return 'CANDIDATE_ELIGIBILITY';
  }
  if (/FORM|DEMOGRAPHIC|EEO|DISCLOSURE|ACKNOWLEDGE|SUBMISSION/.test(code)) {
    return 'APPLICATION_FORM';
  }
  if (
    /EXPERIENCE|SKILL|TECH|TOOL|EDUCATION|DEGREE|CERT|PORTFOLIO|LEADER|DOMAIN|RESPONS|ACHIEVE|LANGUAGE/.test(
      code,
    )
  ) {
    return 'RESUME_EVIDENCE';
  }

  const haystack = `${input.sourceText ?? ''} ${input.assertion ?? ''}`;
  if (haystack.trim()) {
    if (ELIGIBILITY_HINTS.test(haystack)) return 'CANDIDATE_ELIGIBILITY';
    if (RESUME_HINTS.test(haystack)) return 'RESUME_EVIDENCE';
  }

  return 'UNKNOWN';
}

export function humanizeRequirementCode(code: string): string {
  const known: Record<string, string> = {
    TOTAL_EXPERIENCE_YEARS: 'Total professional experience',
    YEARS_OF_EXPERIENCE: 'Years of experience',
    MOBILE_DESIGN_EXPERIENCE: 'Mobile product design experience',
    PORTFOLIO: 'Portfolio or case studies',
    WORK_REGION: 'Work region',
    WORK_AUTHORIZATION: 'Work authorization',
    SPONSORSHIP: 'Visa sponsorship',
    EDUCATION: 'Education',
    CERTIFICATION: 'Certification',
    CERTIFICATIONS: 'Certifications',
    SKILLS: 'Skills',
    LEADERSHIP: 'Leadership experience',
  };
  const key = code.trim().toUpperCase().replace(/\s+/g, '_');
  if (known[key]) return known[key];
  return key
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
