/**
 * Shared helpers: ensure Optimize suggestions cover JD skills / summary / experience.
 * Used by AI enricher and DB fallback — keeps cross-field JD gaps visible.
 */

export type CoverageSuggestion = {
  id: string;
  title: string;
  category: string;
  originalText: string;
  suggestedText: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
};

export function uniqSkills(skills: string[]): string[] {
  return skills
    .map((item) => item.trim())
    .filter(Boolean)
    .filter(
      (item, index, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index,
    );
}

export function suggestionCoversCategory(
  suggestions: Array<{ category: string; suggestedText?: string }>,
  category: string,
): boolean {
  return suggestions.some((item) => new RegExp(`^${category}$`, 'i').test(item.category));
}

export function suggestionCoversJdSkills(
  suggestions: Array<{ category: string; suggestedText?: string }>,
  missingSkills: string[],
): boolean {
  return suggestions.some(
    (item) =>
      /^skills$/i.test(item.category) &&
      missingSkills.some((skill) =>
        (item.suggestedText ?? '').toLowerCase().includes(skill.toLowerCase()),
      ),
  );
}

export function buildJdCoverageExtras(input: {
  missingSkills: string[];
  currentSkillsLine?: string;
  improvedSummary?: string;
  targetRole?: string;
  experience?: { originalText: string; optimizedText: string } | null;
  existing: Array<{ category: string; suggestedText?: string }>;
}): CoverageSuggestion[] {
  const extras: CoverageSuggestion[] = [];
  const missing = uniqSkills(input.missingSkills).slice(0, 10);
  const role = input.targetRole?.trim();

  if (missing.length > 0 && !suggestionCoversJdSkills(input.existing, missing)) {
    const current = input.currentSkillsLine?.trim() ?? '';
    extras.push({
      id: 'coverage-jd-skills',
      title: `Add ${missing.slice(0, 3).join(', ')} for JD ATS match`,
      category: 'skills',
      originalText: current,
      suggestedText: uniqSkills([
        ...current.split(/[,|]/).map((item) => item.trim()).filter(Boolean),
        ...missing,
      ]).join(', '),
      impact: 'HIGH',
      reason:
        'These JD-field skills are missing on the resume. Applying updates Skills for better ATS match (recommendation only).',
    });
  }

  const summary = input.improvedSummary?.trim() ?? '';
  if (summary.length > 40 && !suggestionCoversCategory(input.existing, 'summary')) {
    extras.push({
      id: 'coverage-jd-summary',
      title: role ? `Align profile summary to ${role}` : 'Align profile summary to target role',
      category: 'summary',
      originalText: '',
      suggestedText: summary,
      impact: 'HIGH',
      reason: 'Rewrite summary to better match the target role and JD keywords.',
    });
  }

  const exp = input.experience;
  if (
    exp?.optimizedText?.trim() &&
    !suggestionCoversCategory(input.existing, 'experience')
  ) {
    extras.push({
      id: 'coverage-jd-experience',
      title: role ? `Reframe experience toward ${role}` : 'Strengthen an experience bullet',
      category: 'experience',
      originalText: exp.originalText || '',
      suggestedText: exp.optimizedText,
      impact: 'MEDIUM',
      reason: 'Clearer, ATS-friendly wording for a work experience bullet toward the target JD.',
    });
  }

  return extras;
}
