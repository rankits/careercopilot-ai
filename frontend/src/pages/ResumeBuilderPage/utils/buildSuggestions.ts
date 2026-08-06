import type { AnalysisResult, SuggestionItem } from '@/services/resumeBuilder.service';

import { sanitizeExtractedText } from './sanitize';
import { mergeSkillLists, splitSkillTokens } from './skills';
import type { ResumeDraft } from './types';

/** Deterministic negative IDs so skill suggestions stay stable across re-renders. */
export function stableLocalSuggestionId(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  const value = Math.abs(hash) || 1;
  return -value;
}

/** True for client-generated suggestions that are not persisted on the server. */
export const isLocalSuggestionId = (id: number) => id < 0;

/**
 * Build actionable Optimize suggestions when the AI/API returned none
 * (truncated JSON, filtered grounding, etc.).
 *
 * Skill gaps are emitted as **one combined suggestion** (all missing skills)
 * so Apply adds every skill in a single click.
 */
export function buildFallbackSuggestions(input: {
  analysis: AnalysisResult | null;
  draft: ResumeDraft;
}): SuggestionItem[] {
  const { analysis, draft } = input;
  const items: SuggestionItem[] = [];

  const missingSkills = mergeSkillLists(
    analysis?.skillAnalysis?.missingSkills,
    analysis?.skillAnalysis?.recommendedSkills,
    analysis?.keywords?.filter((item) => item.status === 'MISSING').map((item) => item.term),
  ).slice(0, 12);

  if (missingSkills.length > 0) {
    const label = missingSkills.join(', ');
    items.push({
      id: stableLocalSuggestionId(
        `skills:bundle:${missingSkills
          .map((skill) => skill.toLowerCase())
          .sort()
          .join('|')}`,
      ),
      title:
        missingSkills.length === 1
          ? `Add ${missingSkills[0]} to Skills`
          : `Add ${missingSkills.length} missing skills`,
      category: 'skills',
      originalText: label,
      suggestedText: label,
      impact: 'HIGH',
      status: 'PENDING',
      reason: `${label} appear in your target JD / missing keywords. Apply once to add all of them and boost ATS skill match.`,
    });
  }

  const optimizedSummary = analysis?.optimizedSummary?.trim() ?? '';
  if (
    optimizedSummary.length > 40 &&
    draft.summary.trim() &&
    optimizedSummary.toLowerCase() !== draft.summary.trim().toLowerCase()
  ) {
    items.push({
      id: stableLocalSuggestionId(`summary:${analysis?.id ?? 'local'}`),
      title: 'Align profile summary to target role',
      category: 'summary',
      originalText: draft.summary,
      suggestedText: optimizedSummary,
      impact: 'HIGH',
      status: 'PENDING',
      reason: 'AI rewrote your summary to better match the target role and JD keywords.',
    });
  }

  const maybeOcrFix = (category: 'experience' | 'projects', title: string, text: string) => {
    if (!text.trim() || !/[ΣΘσθŸÿﬁﬂﬀ]/.test(text)) return;
    const cleaned = sanitizeExtractedText(text);
    if (!cleaned || cleaned === text) return;
    items.push({
      id: stableLocalSuggestionId(`ocr:${category}:${title}:${text.slice(0, 40)}`),
      title,
      category,
      originalText: text,
      suggestedText: cleaned,
      impact: 'MEDIUM',
      status: 'PENDING',
      reason: 'OCR / encoding artifacts detected (e.g. Σ→tt, Θ→ti). Apply to clean the text.',
    });
  };

  draft.experiences.forEach((entry, index) => {
    maybeOcrFix(
      'experience',
      `Fix OCR text in experience #${index + 1}`,
      entry.details || `${entry.title} ${entry.company}`,
    );
  });

  draft.projectsList.forEach((entry, index) => {
    maybeOcrFix(
      'projects',
      `Fix OCR text in project: ${entry.title || `#${index + 1}`}`,
      entry.details || entry.title,
    );
  });

  if (draft.summary && /[ΣΘσθŸÿﬁﬂﬀ]/.test(draft.summary)) {
    const cleaned = sanitizeExtractedText(draft.summary);
    if (cleaned && cleaned !== draft.summary) {
      items.push({
        id: stableLocalSuggestionId(`ocr:summary:${analysis?.id ?? 'local'}`),
        title: 'Fix OCR characters in summary',
        category: 'summary',
        originalText: draft.summary,
        suggestedText: cleaned,
        impact: 'MEDIUM',
        status: 'PENDING',
        reason: 'Summary contains OCR glyph errors.',
      });
    }
  }

  return items;
}

/**
 * Collapse multiple pending skill cards into a single "add all missing skills" card.
 * Returns the display list plus any server suggestion ids that should be marked APPLIED
 * when the bundled card is applied.
 */
export function consolidatePendingSkillSuggestions(items: SuggestionItem[]): {
  items: SuggestionItem[];
  bundledServerIds: number[];
} {
  const pendingSkills: SuggestionItem[] = [];
  const rest: SuggestionItem[] = [];

  for (const item of items) {
    if (/skill/i.test(item.category) && item.status === 'PENDING') {
      pendingSkills.push(item);
    } else {
      rest.push(item);
    }
  }

  if (pendingSkills.length <= 1) {
    return {
      items,
      bundledServerIds: pendingSkills
        .filter((item) => !isLocalSuggestionId(item.id))
        .map((item) => item.id),
    };
  }

  const skillNames = mergeSkillLists(...pendingSkills.map((item) => skillsFromSuggestion(item)));
  if (skillNames.length === 0) {
    return { items, bundledServerIds: [] };
  }

  const bundledServerIds = pendingSkills
    .filter((item) => !isLocalSuggestionId(item.id))
    .map((item) => item.id);
  const label = skillNames.join(', ');
  const combined: SuggestionItem = {
    id:
      bundledServerIds[0] ??
      stableLocalSuggestionId(
        `skills:bundle:${skillNames
          .map((skill) => skill.toLowerCase())
          .sort()
          .join('|')}`,
      ),
    title:
      skillNames.length === 1
        ? `Add ${skillNames[0]} to Skills`
        : `Add ${skillNames.length} missing skills`,
    category: 'skills',
    originalText: label,
    suggestedText: label,
    impact: 'HIGH',
    status: 'PENDING',
    reason: `Add these JD skills in one click: ${label}.`,
  };

  return { items: [...rest, combined], bundledServerIds };
}

export function mergeSuggestionLists(
  primary: SuggestionItem[],
  fallback: SuggestionItem[],
): SuggestionItem[] {
  if (primary.some((item) => item.status === 'PENDING')) {
    // Keep API suggestions, but still surface JD skill / summary / experience fallbacks not covered.
    const primarySkillTokens = new Set(
      primary
        .filter((item) => /skill/i.test(item.category))
        .flatMap((item) => skillsFromSuggestion(item).map((skill) => skill.toLowerCase()))
        .filter(Boolean),
    );
    const hasPendingSkills = primary.some(
      (item) => /skill/i.test(item.category) && item.status === 'PENDING',
    );
    const hasSummary = primary.some((item) => /^summary$/i.test(item.category));
    const hasExperience = primary.some((item) => /^experience$/i.test(item.category));
    const extras = fallback.filter((item) => {
      if (/skill/i.test(item.category)) {
        // If API already has any pending skill card, skip fallback skill cards
        // (they'll be consolidated together only when both contribute unique skills).
        if (hasPendingSkills) {
          const fallbackSkills = skillsFromSuggestion(item).map((skill) => skill.toLowerCase());
          return fallbackSkills.some((skill) => !primarySkillTokens.has(skill));
        }
        return !skillsFromSuggestion(item).every((skill) =>
          primarySkillTokens.has(skill.toLowerCase()),
        );
      }
      if (/^summary$/i.test(item.category)) return !hasSummary;
      if (/^experience$/i.test(item.category)) return !hasExperience;
      return false;
    });
    return [...primary, ...extras];
  }
  if (primary.length > 0 && fallback.length === 0) return primary;
  const pendingPrimary = primary.filter((item) => item.status === 'PENDING');
  if (pendingPrimary.length > 0) return primary;
  return [...primary, ...fallback];
}

/** Resolve every skill a skills-category suggestion intends to add. */
export function skillsFromSuggestion(
  suggestion: Pick<SuggestionItem, 'title' | 'suggestedText' | 'originalText'>,
): string[] {
  const fromSuggested = splitSkillTokens(suggestion.suggestedText || '');
  if (fromSuggested.length > 0) return fromSuggested;

  const fromOriginal = splitSkillTokens(suggestion.originalText || '');
  if (fromOriginal.length > 0) return fromOriginal;

  const titleMatch = suggestion.title.match(/^Add\s+(.+?)\s+to\s+Skills$/i);
  if (titleMatch?.[1]) return splitSkillTokens(titleMatch[1]);

  const countMatch = suggestion.title.match(/^Add\s+(\d+)\s+missing skills$/i);
  if (countMatch && suggestion.suggestedText.trim()) {
    return splitSkillTokens(suggestion.suggestedText);
  }

  return [];
}

/** Resolve the primary skill a skills-category suggestion intends to add. */
export function skillFromSuggestion(
  suggestion: Pick<SuggestionItem, 'title' | 'suggestedText' | 'originalText'>,
): string {
  return skillsFromSuggestion(suggestion)[0] ?? '';
}
