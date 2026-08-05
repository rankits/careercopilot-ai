import type { AnalysisResult, SuggestionItem } from '@/services/resumeBuilder.service';

import { sanitizeExtractedText } from './sanitize';
import { mergeSkillLists } from './skills';
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
 * Skill gaps are emitted as **one suggestion per missing skill** with a stable id
 * so Apply never regenerates or reshuffles the remaining list.
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

  for (const skill of missingSkills) {
    items.push({
      id: stableLocalSuggestionId(`skill:${skill.toLowerCase()}`),
      title: `Add ${skill} to Skills`,
      category: 'skills',
      originalText: skill,
      suggestedText: skill,
      impact: 'HIGH',
      status: 'PENDING',
      reason: `${skill} appears in your target JD / missing keywords. Adding it boosts ATS skill match.`,
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

export function mergeSuggestionLists(
  primary: SuggestionItem[],
  fallback: SuggestionItem[],
): SuggestionItem[] {
  if (primary.some((item) => item.status === 'PENDING')) {
    // Keep API suggestions, but still surface JD skill / summary / experience fallbacks not covered.
    const primarySkills = new Set(
      primary
        .filter((item) => /skill/i.test(item.category))
        .map((item) => item.suggestedText.trim().toLowerCase())
        .filter(Boolean),
    );
    const hasSummary = primary.some((item) => /^summary$/i.test(item.category));
    const hasExperience = primary.some((item) => /^experience$/i.test(item.category));
    const extras = fallback.filter((item) => {
      if (/skill/i.test(item.category)) {
        return !primarySkills.has(item.suggestedText.trim().toLowerCase());
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

/** Resolve the single skill a skills-category suggestion intends to add. */
export function skillFromSuggestion(suggestion: Pick<SuggestionItem, 'title' | 'suggestedText'>): string {
  const fromSuggested = suggestion.suggestedText.trim();
  if (fromSuggested && !fromSuggested.includes(',') && fromSuggested.split(/\s+/).length <= 4) {
    return fromSuggested;
  }

  const titleMatch = suggestion.title.match(/^Add\s+(.+?)\s+to\s+Skills$/i);
  if (titleMatch?.[1]) return titleMatch[1].trim();

  return fromSuggested.split(/[,|]/)[0]?.trim() ?? fromSuggested;
}
