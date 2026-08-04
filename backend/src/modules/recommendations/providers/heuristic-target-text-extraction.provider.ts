import type { RecommendationExtractionProvider } from '@/modules/recommendations/contracts/recommendation-provider.contracts.js';
import type { ExtractedRecommendationContext } from '@/modules/recommendations/types/recommendations.types.js';

const TITLE_PATTERNS: Array<[RegExp, string]> = [
  [/\bbackend(?:\s+software)?\s+engineer\b/i, 'Backend Engineer'],
  [/\bfrontend(?:\s+software)?\s+engineer\b/i, 'Frontend Engineer'],
  [/\bfull[-\s]?stack(?:\s+software)?\s+engineer\b/i, 'Full Stack Engineer'],
  [/\bplatform\s+engineer\b/i, 'Platform Engineer'],
  [/\bdevops\s+engineer\b/i, 'DevOps Engineer'],
  [/\bdata\s+scientist\b/i, 'Data Scientist'],
  [/\bdata\s+engineer\b/i, 'Data Engineer'],
  [/\bproduct\s+manager\b/i, 'Product Manager'],
  [/\bengineering\s+manager\b/i, 'Engineering Manager'],
];

const SKILL_PATTERNS: Array<[RegExp, string]> = [
  [/\bnode(?:\.js|js)?\b/i, 'Node.js'],
  [/\btypescript\b/i, 'TypeScript'],
  [/\bjavascript\b/i, 'JavaScript'],
  [/\breact(?:\.js)?\b/i, 'React'],
  [/\bnext(?:\.js)?\b/i, 'Next.js'],
  [/\bvue(?:\.js)?\b/i, 'Vue.js'],
  [/\bangular\b/i, 'Angular'],
  [/\bpython\b/i, 'Python'],
  [/\bjava\b/i, 'Java'],
  [/\bgolang\b|\bgo\b/i, 'Go'],
  [/\bruby\b/i, 'Ruby'],
  [/\bpostgres(?:ql)?\b/i, 'PostgreSQL'],
  [/\bsql\b/i, 'SQL'],
  [/\bmongodb\b/i, 'MongoDB'],
  [/\bredis\b/i, 'Redis'],
  [/\baws\b/i, 'AWS'],
  [/\bazure\b/i, 'Azure'],
  [/\bgcp\b|\bgoogle cloud\b/i, 'Google Cloud'],
  [/\bdocker\b/i, 'Docker'],
  [/\bkubernetes\b|\bk8s\b/i, 'Kubernetes'],
  [/\bterraform\b/i, 'Terraform'],
  [/\bgraphql\b/i, 'GraphQL'],
  [/\brest(?:ful)?\b/i, 'REST'],
  [/\bmachine learning\b|\bml\b/i, 'Machine Learning'],
];

const INDUSTRY_PATTERNS: Array<[RegExp, string]> = [
  [/\bfintech\b|\bpayments?\b/i, 'Fintech'],
  [/\bhealth(?:care| tech)?\b/i, 'Healthcare'],
  [/\be[-\s]?commerce\b|\bretail\b/i, 'Ecommerce'],
  [/\bsaas\b/i, 'SaaS'],
  [/\bedtech\b|\beducation\b/i, 'Education'],
];

const uniqueMatches = (text: string, patterns: Array<[RegExp, string]>): string[] => {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const [pattern, label] of patterns) {
    if (!pattern.test(text)) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(label);
  }
  return values;
};

const normalizeText = (text: string): string =>
  text
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const remotePreferenceFrom = (text: string): string | undefined => {
  if (/\b(remote|work from home|wfh)\b/i.test(text)) return 'REMOTE';
  if (/\bhybrid\b/i.test(text)) return 'HYBRID';
  if (/\b(on[-\s]?site|office[-\s]?based)\b/i.test(text)) return 'ONSITE';
  return undefined;
};

const employmentTypesFrom = (text: string): string[] => {
  const values: string[] = [];
  if (/\bfull[-\s]?time\b/i.test(text)) values.push('FULL_TIME');
  if (/\bpart[-\s]?time\b/i.test(text)) values.push('PART_TIME');
  if (/\bcontract\b|\bcontractor\b/i.test(text)) values.push('CONTRACT');
  if (/\bintern(ship)?\b/i.test(text)) values.push('INTERNSHIP');
  return values;
};

const salaryFrom = (text: string): ExtractedRecommendationContext['salaryExpectation'] => {
  const currency = /\bINR\b|₹/i.test(text) ? 'INR' : /\bUSD\b|\$/i.test(text) ? 'USD' : undefined;
  const minimumMatch = /\b(?:min(?:imum)?|at least|from)\s*(?:USD|INR|[$₹])?\s*([\d,]+)/i.exec(
    text,
  );
  const maximumMatch = /\b(?:max(?:imum)?|up to|under)\s*(?:USD|INR|[$₹])?\s*([\d,]+)/i.exec(text);
  const toNumber = (value: string | undefined): number | undefined => {
    if (!value) return undefined;
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  return {
    minimum: toNumber(minimumMatch?.[1]),
    maximum: toNumber(maximumMatch?.[1]),
    currency,
  };
};

const fallbackTitleFromSkills = (skills: readonly string[]): string[] => {
  if (skills.some((skill) => ['Node.js', 'Go', 'Java', 'PostgreSQL'].includes(skill))) {
    return ['Backend Engineer'];
  }
  if (skills.some((skill) => ['React', 'Vue.js', 'Angular'].includes(skill))) {
    return ['Frontend Engineer'];
  }
  return [];
};

export class HeuristicTargetTextExtractionProvider implements RecommendationExtractionProvider {
  async extractContextFromText(text: string): Promise<ExtractedRecommendationContext> {
    const sourceText = normalizeText(text);
    const requiredSkills = uniqueMatches(sourceText, SKILL_PATTERNS);
    const targetTitles = uniqueMatches(sourceText, TITLE_PATTERNS);

    return {
      targetTitles:
        targetTitles.length > 0 ? targetTitles : fallbackTitleFromSkills(requiredSkills),
      relatedTitles: [],
      requiredSkills,
      preferredSkills: [],
      industries: uniqueMatches(sourceText, INDUSTRY_PATTERNS),
      locations: [],
      remotePreference: remotePreferenceFrom(sourceText),
      employmentTypes: employmentTypesFrom(sourceText),
      salaryExpectation: salaryFrom(sourceText),
      education: [],
      certifications: [],
      excludedCompanies: [],
      excludedSkills: [],
      sourceText,
    };
  }
}
