import { describe, expect, it } from 'vitest';

import type { SuggestionItem } from '@/services/resumeBuilder.service';

import {
  buildFallbackSuggestions,
  isLocalSuggestionId,
  mergeSuggestionLists,
  skillFromSuggestion,
  stableLocalSuggestionId,
} from './buildSuggestions';
import { createEmptyDraft } from './draft';

describe('buildFallbackSuggestions', () => {
  it('creates one stable skill suggestion per missing JD skill', () => {
    const draft = {
      ...createEmptyDraft('Java Developer'),
      summary: 'Backend engineer with React experience across production apps.',
      skillsList: ['React', 'TypeScript'],
    };

    const analysis = {
      id: 42,
      skillAnalysis: {
        matchedSkills: ['React'],
        missingSkills: ['Java', 'Spring Boot'],
        transferableSkills: [],
        recommendedSkills: ['Hibernate'],
      },
      keywords: [],
    } as never;

    const first = buildFallbackSuggestions({ analysis, draft });
    const second = buildFallbackSuggestions({ analysis, draft });

    const skillItems = first.filter((item) => item.category === 'skills');
    expect(skillItems.length).toBe(3);
    expect(skillItems.every((item) => isLocalSuggestionId(item.id))).toBe(true);
    expect(skillItems.map((item) => item.suggestedText)).toEqual([
      'Java',
      'Spring Boot',
      'Hibernate',
    ]);
    expect(skillItems.map((item) => item.id)).toEqual(
      second.filter((item) => item.category === 'skills').map((item) => item.id),
    );
    expect(stableLocalSuggestionId('skill:java')).toBe(skillItems[0]!.id);
  });

  it('prefers primary pending suggestions but still adds missing skill fallbacks', () => {
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
        title: 'Add Java to Skills',
        category: 'skills',
        originalText: 'Java',
        suggestedText: 'Java',
        impact: 'HIGH',
        status: 'PENDING',
      },
    ];
    expect(mergeSuggestionLists(primary, fallback)).toEqual([...primary, ...fallback]);
  });

  it('extracts the single skill from a suggestion', () => {
    expect(
      skillFromSuggestion({
        title: 'Add Spring Boot to Skills',
        suggestedText: 'Spring Boot',
      }),
    ).toBe('Spring Boot');
  });
});
