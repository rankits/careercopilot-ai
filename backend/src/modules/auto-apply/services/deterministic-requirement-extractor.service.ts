import type { IRequirementExtractor } from '@/modules/auto-apply/contracts/application-page-analysis.contract.js';
import type {
  ExtractedRequirement,
  GeographicValue,
} from '@/modules/auto-apply/types/application-page-analysis.types.js';

function pushRequirement(
  list: ExtractedRequirement[],
  requirement: Omit<ExtractedRequirement, 'required'> & { required?: boolean },
): void {
  const required =
    requirement.required ??
    (requirement.importance === 'REQUIRED' &&
      (requirement.assertion === 'REQUIRES' || requirement.assertion === 'DOES_NOT_ALLOW'));
  list.push({ ...requirement, required });
}

function extractWorkRegion(text: string, sourceUrl: string): ExtractedRequirement | null {
  const patterns: Array<{ re: RegExp; raw: string; region: string; countries: string[] }> = [
    {
      re: /(?:based in|located in|open (?:only )?to candidates (?:based )?in|limited to candidates (?:based )?in)\s+North America/i,
      raw: 'North America',
      region: 'NORTH_AMERICA',
      countries: [],
    },
    {
      re: /(?:United States|USA|U\.S\.A\.)\s+(?:only|based)/i,
      raw: 'United States',
      region: 'UNITED_STATES',
      countries: ['US'],
    },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.re);
    if (!match) continue;
    const geographic: GeographicValue = {
      rawValue: pattern.raw,
      normalizedRegion: pattern.region,
      explicitCountries: pattern.countries,
      interpretationStatus: pattern.countries.length > 0 ? 'EXPLICIT_COUNTRIES' : 'REVIEW_REQUIRED',
    };
    return {
      code: 'WORK_REGION',
      operator: 'IN',
      value: pattern.countries.length > 0 ? pattern.countries : [pattern.region],
      importance: 'REQUIRED',
      assertion: 'REQUIRES',
      required: true,
      confidence: 0.99,
      evidenceStrength: 'EXPLICIT_TEXT',
      extractionMethod: 'DOM_RULE',
      sourceText: match[0],
      sourceUrl,
      geographic,
      reviewStatus:
        geographic.interpretationStatus === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 'AUTO_ACCEPTED',
      source: { type: 'JOB_DESCRIPTION', text: match[0], url: sourceUrl },
    };
  }
  return null;
}

function extractExperienceYears(text: string, sourceUrl: string): ExtractedRequirement | null {
  const match =
    text.match(/(\d+)\+?\s*(?:\+\s*)?years?\s+(?:of\s+)?(?:experience|designing|building)/i) ??
    text.match(/(?:minimum|at least)\s+(\d+)\s+years?/i);
  if (!match?.[1]) return null;
  const years = Number(match[1]);
  if (!Number.isFinite(years) || years <= 0 || years > 40) return null;
  return {
    code: 'TOTAL_EXPERIENCE_YEARS',
    operator: 'GTE',
    value: years,
    importance: 'REQUIRED',
    assertion: 'REQUIRES',
    required: true,
    confidence: 0.98,
    evidenceStrength: 'EXPLICIT_TEXT',
    extractionMethod: 'DOM_RULE',
    sourceText: match[0],
    sourceUrl,
    reviewStatus: 'AUTO_ACCEPTED',
    source: { type: 'JOB_DESCRIPTION', text: match[0], url: sourceUrl },
  };
}

function extractMobileExperience(text: string, sourceUrl: string): ExtractedRequirement | null {
  const match = text.match(
    /mobile(?:-|\s)?(?:specific\s+)?(?:product\s+)?design(?:ing)?(?:\s+experience)?/i,
  );
  if (!match) return null;
  return {
    code: 'MOBILE_DESIGN_EXPERIENCE',
    operator: 'REQUIRED',
    value: true,
    importance: 'REQUIRED',
    assertion: 'REQUIRES',
    required: true,
    confidence: 0.95,
    evidenceStrength: 'EXPLICIT_TEXT',
    extractionMethod: 'DOM_RULE',
    sourceText: match[0],
    sourceUrl,
    reviewStatus: 'AUTO_ACCEPTED',
    source: { type: 'JOB_DESCRIPTION', text: match[0], url: sourceUrl },
  };
}

function extractSponsorship(text: string, sourceUrl: string): ExtractedRequirement | null {
  const notRequired = text.match(
    /(?:visa\s+)?sponsorship\s+is\s+not\s+(?:required|available|provided)|do(?:es)?\s+not\s+(?:offer|provide)\s+(?:visa\s+)?sponsorship|no\s+(?:visa\s+)?sponsorship/i,
  );
  if (notRequired) {
    return {
      code: 'SPONSORSHIP',
      operator: 'EQ',
      value: false,
      importance: 'REQUIRED',
      assertion: 'DOES_NOT_PROVIDE',
      required: false,
      confidence: 0.97,
      evidenceStrength: 'EXPLICIT_TEXT',
      extractionMethod: 'DOM_RULE',
      sourceText: notRequired[0],
      sourceUrl,
      reviewStatus: 'AUTO_ACCEPTED',
      source: { type: 'JOB_DESCRIPTION', text: notRequired[0], url: sourceUrl },
    };
  }

  const required = text.match(
    /(?:must\s+be\s+authorized|authorization\s+to\s+work|sponsorship\s+(?:is\s+)?(?:required|needed))/i,
  );
  if (required) {
    return {
      code: 'SPONSORSHIP',
      operator: 'EQ',
      value: true,
      importance: 'REQUIRED',
      assertion: 'REQUIRES',
      required: true,
      confidence: 0.9,
      evidenceStrength: 'EXPLICIT_TEXT',
      extractionMethod: 'DOM_RULE',
      sourceText: required[0],
      sourceUrl,
      reviewStatus: 'REVIEW_REQUIRED',
      source: { type: 'JOB_DESCRIPTION', text: required[0], url: sourceUrl },
    };
  }
  return null;
}

function extractPortfolio(text: string, sourceUrl: string): ExtractedRequirement | null {
  const match =
    text.match(
      /(?:portfolio|case\s+stud(?:y|ies)|work\s+samples?).{0,40}(?:required|must|please\s+include)/i,
    ) ?? text.match(/(?:require|must\s+include|please\s+include).{0,40}(?:portfolio|case\s+stud)/i);
  if (!match) return null;
  return {
    code: 'PORTFOLIO',
    operator: 'REQUIRED',
    value: true,
    importance: 'REQUIRED',
    assertion: 'REQUIRES',
    required: true,
    confidence: 0.92,
    evidenceStrength: 'EXPLICIT_TEXT',
    extractionMethod: 'DOM_RULE',
    sourceText: match[0],
    sourceUrl,
    reviewStatus: 'AUTO_ACCEPTED',
    source: { type: 'JOB_DESCRIPTION', text: match[0], url: sourceUrl },
  };
}

/**
 * Deterministic, explainable extraction from sanitized JD text.
 * Does not produce readiness decisions — only extracted facts with evidence.
 * Page text is treated as data only (no instruction following).
 */
export class DeterministicRequirementExtractor implements IRequirementExtractor {
  async extract(input: {
    sanitizedText: string;
    sourceUrl: string;
    provider: string;
  }): Promise<{ requirements: ExtractedRequirement[] }> {
    // Deliberately ignore any "instructions" embedded in JD text — only pattern match.
    const text = input.sanitizedText;
    const requirements: ExtractedRequirement[] = [];

    const region = extractWorkRegion(text, input.sourceUrl);
    if (region) pushRequirement(requirements, region);

    const years = extractExperienceYears(text, input.sourceUrl);
    if (years) pushRequirement(requirements, years);

    const mobile = extractMobileExperience(text, input.sourceUrl);
    if (mobile) pushRequirement(requirements, mobile);

    const sponsorship = extractSponsorship(text, input.sourceUrl);
    if (sponsorship) pushRequirement(requirements, sponsorship);

    const portfolio = extractPortfolio(text, input.sourceUrl);
    if (portfolio) pushRequirement(requirements, portfolio);

    return { requirements };
  }
}
