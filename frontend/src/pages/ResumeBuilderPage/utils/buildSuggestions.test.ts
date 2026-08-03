import { describe, expect, it } from 'vitest';

import type { SuggestionItem } from '@/services/resumeBuilder.service';

import { buildFallbackSuggestions, isLocalSuggestionId, mergeSuggestionLists } from './buildSuggestions';
import { createEmptyDraft } from './draft';

describe('buildFallbackSuggestions', () => {
  it('creates a skills suggestion from missing JD skills', () => {
    const draft = {
      ...createEmptyDraft('Java Developer'),
      summary: 'Backend engineer with React experience across production apps.',
      skillsList: ['React', 'TypeScript'],
    };

    const suggestions = buildFallbackSuggestions({
      analysis: {
        skillAnalysis: {
          matchedSkills: ['React'],
          missingSkills: ['Java', 'Spring Boot'],
          transferableSkills: [],
          recommendedSkills: ['Hibernate'],
        },
        keywords: [],
      } as never,
      draft,
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((item) => item.category === 'skills')).toBe(true);
    expect(isLocalSuggestionId(suggestions[0]!.id)).toBe(true);
  });

  it('prefers primary pending suggestions over fallbacks', () => {
    const primary: SuggestionItem[] = [
      {
        id: 1,
        title: 'AI fix',
        category: 'summary',
        originalText: 'a',
        suggestedText: 'b',
        impact: 'HIGH',
        status: 'PENDING',
      },
    ];
    const fallback: SuggestionItem[] = [
      {
        id: -1,
        title: 'Local',
        category: 'skills',
        originalText: '',
        suggestedText: 'Java',
        impact: 'HIGH',
        status: 'PENDING',
      },
    ];
    expect(mergeSuggestionLists(primary, fallback)).toEqual(primary);
  });
});
