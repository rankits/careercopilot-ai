/**
 * Client-side ATS uplift estimate used on the Optimize step.
 * Mirrors backend improvement signals (recovered keywords/skills + applied fixes).
 * Final score still comes from POST /recheck on Export.
 */
export function estimateImprovedAtsScore(input: {
  baseline: number;
  content: string;
  missingSkills?: string[];
  missingKeywords?: string[];
  appliedCount: number;
  highAppliedCount?: number;
}): number {
  const baseline = Math.min(100, Math.max(0, Math.round(input.baseline)));
  const contentLower = (input.content || '').toLowerCase();

  const recoveredSkills = (input.missingSkills ?? []).filter((skill) =>
    contentLower.includes(skill.trim().toLowerCase()),
  ).length;
  const recoveredKeywords = (input.missingKeywords ?? []).filter((term) =>
    contentLower.includes(term.trim().toLowerCase()),
  ).length;

  const uplift = Math.min(
    38,
    recoveredSkills * 2.5 +
      recoveredKeywords * 2 +
      (input.highAppliedCount ?? 0) * 4 +
      input.appliedCount * 1.5,
  );

  if (uplift < 2) return baseline;
  return Math.min(99, Math.max(baseline + Math.round(uplift * 0.75), baseline + 3));
}

export function scoreTone(score: number): 'success' | 'warning' | 'error' {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'error';
}
