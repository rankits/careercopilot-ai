/**
 * Client-side ATS uplift estimate used on the Optimize step.
 * Mirrors backend improvement signals (recovered keywords/skills + applied fixes).
 * Final score still comes from POST /recheck on Export / after Apply.
 */

export type LiveSkillAnalysis = {
  matchedSkills: string[];
  missingSkills: string[];
  transferableSkills: string[];
  additionalSkills?: string[];
  recommendedSkills: string[];
};

function uniqSkills(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compactSkillToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.js$/i, 'js')
    .replace(/[\s._/-]+/g, '');
}

/** Word-aware skill match aligned with backend `skillAppearsIn` (React ≈ React.js ≈ ReactJS). */
export function contentHasSkill(content: string, skill: string): boolean {
  const cleaned = skill.trim();
  if (!cleaned || !content) return false;
  const softened = content
    .replace(/\u00ad/g, '')
    .replace(/\u200b/g, '')
    .replace(/\u200c/g, '')
    .replace(/\u200d/g, '')
    .replace(/\ufeff/g, '')
    .replace(/\b([A-Za-z]{2,20})\s*\.\s*js\b/gi, '$1.js')
    .replace(/\b(React|Node|Next|Vue|Express)(?:[._\s-])*js\b/gi, '$1.js');

  const base = cleaned.replace(/\.js$/i, '');
  const variants = Array.from(
    new Set([
      cleaned,
      base,
      `${base}.js`,
      `${base}js`,
      `${base} js`,
      cleaned.endsWith('.js') || cleaned.endsWith('.JS') ? cleaned : `${cleaned}.js`,
    ]),
  ).filter((item) => item.length >= 1);

  for (const variant of variants) {
    const escaped = escapeRegExp(variant).replace(/\s+/g, '\\s+');
    const startsWithWord = /^[A-Za-z0-9]/.test(variant);
    const endsWithWord = /[A-Za-z0-9]$/.test(variant);
    const prefix = startsWithWord ? '\\b' : '(?<![A-Za-z0-9])';
    const suffix = endsWithWord ? '\\b' : '(?![A-Za-z0-9])';

    try {
      if (new RegExp(`${prefix}${escaped}${suffix}`, 'i').test(softened)) return true;
    } catch {
      if (softened.toLowerCase().includes(variant.toLowerCase())) return true;
    }
  }

  const want = compactSkillToken(cleaned);
  if (want.length >= 4) {
    const contentCompact = compactSkillToken(softened);
    if (contentCompact.includes(want)) return true;
    if (!want.endsWith('js') && contentCompact.includes(`${want}js`)) return true;
  }

  return false;
}

/**
 * Recompute matched/missing skills from current resume text against the
 * original JD skill pool so Missing Skills / Skill Match refresh after Apply.
 */
export function refreshSkillAnalysisFromContent(
  content: string,
  previous?: LiveSkillAnalysis | null,
): LiveSkillAnalysis {
  const base: LiveSkillAnalysis = previous ?? {
    matchedSkills: [],
    missingSkills: [],
    transferableSkills: [],
    recommendedSkills: [],
  };

  const pool = uniqSkills([
    ...base.matchedSkills,
    ...base.missingSkills,
    ...base.recommendedSkills,
  ]);

  if (pool.length === 0) {
    return {
      matchedSkills: [],
      missingSkills: [],
      transferableSkills: base.transferableSkills,
      recommendedSkills: [],
    };
  }

  // Empty content must NEVER flip matched → missing (Analysis page race / stale state).
  if (!content.trim()) {
    return {
      matchedSkills: uniqSkills(base.matchedSkills),
      missingSkills: uniqSkills([...base.missingSkills, ...base.recommendedSkills]).filter(
        (skill) =>
          !base.matchedSkills.some((matched) => matched.toLowerCase() === skill.toLowerCase()),
      ),
      transferableSkills: base.transferableSkills,
      recommendedSkills: uniqSkills(
        base.recommendedSkills.length ? base.recommendedSkills : base.missingSkills,
      ),
    };
  }

  const matchedSkills = pool.filter((skill) => contentHasSkill(content, skill));
  const missingSkills = pool.filter((skill) => !contentHasSkill(content, skill));

  return {
    matchedSkills,
    missingSkills,
    transferableSkills: base.transferableSkills,
    recommendedSkills: missingSkills,
  };
}

export function liveSkillMatchPercent(analysis: LiveSkillAnalysis): number | null {
  const total = analysis.matchedSkills.length + analysis.missingSkills.length;
  if (total === 0) return null;
  return Math.round((100 * analysis.matchedSkills.length) / total);
}

export function estimateImprovedAtsScore(input: {
  baseline: number;
  content: string;
  missingSkills?: string[];
  missingKeywords?: string[];
  matchedSkills?: string[];
  appliedCount: number;
  highAppliedCount?: number;
}): number {
  const baseline = Math.min(100, Math.max(0, Math.round(input.baseline)));
  const contentLower = (input.content || '').toLowerCase();

  const pool = uniqSkills([...(input.matchedSkills ?? []), ...(input.missingSkills ?? [])]);
  const liveMatched = pool.filter((skill) => contentHasSkill(input.content || '', skill));
  const liveSkillMatch =
    pool.length > 0 ? Math.round((100 * liveMatched.length) / pool.length) : null;

  const recoveredSkills = (input.missingSkills ?? []).filter((skill) =>
    contentHasSkill(input.content || '', skill),
  ).length;
  const recoveredKeywords = (input.missingKeywords ?? []).filter((term) =>
    contentLower.includes(term.trim().toLowerCase()),
  ).length;

  const uplift = Math.min(
    26,
    recoveredSkills * 2.2 +
      recoveredKeywords * 1.6 +
      (input.highAppliedCount ?? 0) * 3 +
      input.appliedCount * 1.2,
  );

  // Prefer live JD ↔ resume skill coverage so scores are not stuck at a flat baseline (e.g. 45/45).
  if (liveSkillMatch != null) {
    const recoveredSkillRatio =
      (input.missingSkills?.length ?? 0) > 0
        ? recoveredSkills / (input.missingSkills?.length ?? 1)
        : liveSkillMatch / 100;
    const softCeiling =
      recoveredSkillRatio >= 0.9
        ? 94
        : recoveredSkillRatio >= 0.7
          ? 90
          : recoveredSkillRatio >= 0.5
            ? 86
            : 84;
    const contentBased = Math.round(
      liveSkillMatch * 0.62 + Math.min(baseline + uplift, softCeiling) * 0.38,
    );
    return Math.min(softCeiling, Math.max(baseline, contentBased));
  }

  if (uplift < 2) return baseline;

  const recoveredSkillRatio =
    (input.missingSkills?.length ?? 0) > 0
      ? recoveredSkills / (input.missingSkills?.length ?? 1)
      : 0;
  const softCeiling =
    recoveredSkillRatio >= 0.9
      ? 94
      : recoveredSkillRatio >= 0.7
        ? 90
        : recoveredSkillRatio >= 0.5
          ? 86
          : 84;

  return Math.min(
    softCeiling,
    baseline + Math.max(2, Math.round(uplift * 0.55)),
    baseline + (recoveredSkillRatio >= 0.85 ? 26 : 18),
  );
}

export function scoreTone(score: number): 'success' | 'warning' | 'error' {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'error';
}
