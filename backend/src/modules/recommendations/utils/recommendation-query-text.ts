import type { RecommendationContext } from '@/modules/recommendations/types/recommendations.types.js';

const joinList = (values: readonly string[]): string =>
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .join(', ');

const optionalLine = (label: string, value: string | number | undefined): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = typeof value === 'string' ? value.trim() : String(value);
  return normalized ? `${label}: ${normalized}` : undefined;
};

/**
 * Builds a retrieval-query document from the already-normalized recommendation
 * context. Source strategies own payload extraction; this helper only formats
 * the shared context fields for the embedding provider.
 */
export const buildRecommendationQueryText = (context: RecommendationContext): string => {
  const salary = context.salaryExpectation;
  const salaryParts = [
    salary.minimum !== undefined ? `min ${salary.minimum}` : undefined,
    salary.maximum !== undefined ? `max ${salary.maximum}` : undefined,
    salary.currency?.trim() || undefined,
  ].filter(Boolean);

  const lines = [
    optionalLine('Target titles', joinList(context.targetTitles)),
    optionalLine('Related titles', joinList(context.relatedTitles)),
    optionalLine('Required skills', joinList(context.requiredSkills)),
    optionalLine('Preferred skills', joinList(context.preferredSkills)),
    optionalLine('Seniority', context.seniority),
    optionalLine('Years of experience', context.yearsOfExperience),
    optionalLine('Industries', joinList(context.industries)),
    optionalLine('Locations', joinList(context.locations)),
    optionalLine('Remote preference', context.remotePreference),
    optionalLine('Employment types', joinList(context.employmentTypes)),
    optionalLine('Salary expectation', salaryParts.join(' ')),
    optionalLine('Education', joinList(context.education)),
    optionalLine('Certifications', joinList(context.certifications)),
    optionalLine('Source text', context.sourceText),
  ].filter((line): line is string => Boolean(line));

  if (lines.length === 0) {
    return 'General job search';
  }
  return lines.join('\n');
};
