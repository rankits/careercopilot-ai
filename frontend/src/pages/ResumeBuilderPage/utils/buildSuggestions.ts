import type { AnalysisResult, SuggestionItem } from '@/services/resumeBuilder.service';

import { sanitizeExtractedText } from './sanitize';
import { mergeSkillLists } from './skills';
import type { ResumeDraft } from './types';

let localSuggestionSeq = -1;

const nextLocalId = () => {
  localSuggestionSeq -= 1;
  return localSuggestionSeq;
};

/** True for client-generated suggestions that are not persisted on the server. */
export const isLocalSuggestionId = (id: number) => id < 0;

/**
 * Build actionable Optimize suggestions when the AI/API returned none
 * (truncated JSON, filtered grounding, etc.).
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
    analysis?.keywords
      ?.filter((item) => item.status === 'MISSING')
      .map((item) => item.term),
  ).slice(0, 8);

  if (missingSkills.length > 0) {
    const currentSkills = draft.skillsList.join(', ');
    const nextSkills = mergeSkillLists(draft.skillsList, missingSkills).join(', ');
    if (nextSkills !== currentSkills) {
      items.push({
        id: nextLocalId(),
        title: `Add ${missingSkills.slice(0, 3).join(', ')} to Skills`,
        category: 'skills',
        originalText: currentSkills,
        suggestedText: nextSkills,
        impact: 'HIGH',
        status: 'PENDING',
        reason:
          'These skills appear in your target JD / missing keywords. Adding them boosts ATS skill match.',
      });
    }
  }

  const optimizedSummary = analysis?.optimizedSummary?.trim() ?? '';
  if (
    optimizedSummary.length > 40 &&
    draft.summary.trim() &&
    optimizedSummary.toLowerCase() !== draft.summary.trim().toLowerCase()
  ) {
    items.push({
      id: nextLocalId(),
      title: 'Align profile summary to target role',
      category: 'summary',
      originalText: draft.summary,
      suggestedText: optimizedSummary,
      impact: 'HIGH',
      status: 'PENDING',
      reason: 'AI rewrote your summary to better match the target role and JD keywords.',
    });
  }

  const maybeOcrFix = (
    category: 'experience' | 'projects',
    title: string,
    text: string,
  ) => {
    if (!text.trim() || !/[ΣΘσθŸÿﬁﬂﬀ]/.test(text)) return;
    const cleaned = sanitizeExtractedText(text);
    if (!cleaned || cleaned === text) return;
    items.push({
      id: nextLocalId(),
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
        id: nextLocalId(),
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

  // Always offer at least one soft improvement when analysis exists but AI suggestions are empty.
  if (items.length === 0 && analysis && draft.summary.trim().length > 20) {
    const tightened = draft.summary.replace(/\s+/g, ' ').trim();
    if (tightened !== draft.summary) {
      items.push({
        id: nextLocalId(),
        title: 'Tighten profile summary spacing',
        category: 'summary',
        originalText: draft.summary,
        suggestedText: tightened,
        impact: 'LOW',
        status: 'PENDING',
        reason: 'Clean whitespace for a sharper ATS-friendly summary.',
      });
    } else {
      items.push({
        id: nextLocalId(),
        title: 'Review skills for JD coverage',
        category: 'skills',
        originalText: draft.skillsList.join(', '),
        suggestedText:
          draft.skillsList.join(', ') ||
          'Add role-relevant skills from the job description',
        impact: 'MEDIUM',
        status: 'PENDING',
        reason:
          'AI returned no rewrite suggestions. Review Skills against the JD and add missing keywords manually.',
      });
    }
  }

  return items;
}

export function mergeSuggestionLists(
  primary: SuggestionItem[],
  fallback: SuggestionItem[],
): SuggestionItem[] {
  if (primary.some((item) => item.status === 'PENDING')) return primary;
  if (primary.length > 0 && fallback.length === 0) return primary;
  const pendingPrimary = primary.filter((item) => item.status === 'PENDING');
  if (pendingPrimary.length > 0) return primary;
  return [...primary, ...fallback];
}
