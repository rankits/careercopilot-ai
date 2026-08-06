import { describe, expect, it } from 'vitest';

import type { SuggestionItem } from '@/services/resumeBuilder.service';

import {
  buildFallbackSuggestions,
  consolidatePendingSkillSuggestions,
  isLocalSuggestionId,
  mergeSuggestionLists,
  skillFromSuggestion,
  skillsFromSuggestion,
  stableLocalSuggestionId,
} from './buildSuggestions';
import { createEmptyDraft } from './draft';

describe('buildFallbackSuggestions', () => {
  it('creates one combined skill suggestion for all missing JD skills', () => {
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
    expect(skillItems.length).toBe(1);
    expect(skillItems.every((item) => isLocalSuggestionId(item.id))).toBe(true);
    expect(skillItems[0]!.suggestedText).toBe('Java, Spring Boot, Hibernate');
    expect(skillItems[0]!.title).toBe('Add 3 missing skills');
    expect(skillItems.map((item) => item.id)).toEqual(
      second.filter((item) => item.category === 'skills').map((item) => item.id),
    );
    expect(skillItems[0]!.id).toBe(
      stableLocalSuggestionId('skills:bundle:hibernate|java|spring boot'),
    );
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

  it('consolidates multiple pending skill cards into one', () => {
    const items: SuggestionItem[] = [
      {
        id: 11,
        title: 'Add Java to Skills',
        category: 'skills',
        originalText: 'Java',
        suggestedText: 'Java',
        impact: 'HIGH',
        status: 'PENDING',
      },
      {
        id: 12,
        title: 'Add Spring Boot to Skills',
        category: 'skills',
        originalText: 'Spring Boot',
        suggestedText: 'Spring Boot',
        impact: 'HIGH',
        status: 'PENDING',
      },
      {
        id: 13,
        title: 'Improve summary',
        category: 'summary',
        originalText: 'a',
        suggestedText: 'b',
        impact: 'MEDIUM',
        status: 'PENDING',
      },
    ];

    const result = consolidatePendingSkillSuggestions(items);
    expect(result.bundledServerIds).toEqual([11, 12]);
    expect(result.items.filter((item) => item.category === 'skills')).toHaveLength(1);
    expect(result.items.find((item) => item.category === 'skills')?.suggestedText).toBe(
      'Java, Spring Boot',
    );
    expect(result.items.find((item) => item.category === 'summary')).toBeTruthy();
  });

  it('extracts all skills from a suggestion', () => {
    expect(
      skillsFromSuggestion({
        title: 'Add 3 missing skills',
        suggestedText: 'Java, Spring Boot, Hibernate',
        originalText: 'Java, Spring Boot, Hibernate',
      }),
    ).toEqual(expect.arrayContaining(['Java', 'Spring Boot', 'Hibernate']));
    expect(
      skillsFromSuggestion({
        title: 'Add 3 missing skills',
        suggestedText: 'Java, Spring Boot, Hibernate',
        originalText: 'Java, Spring Boot, Hibernate',
      }),
    ).toHaveLength(3);
    expect(
      skillFromSuggestion({
        title: 'Add Spring Boot to Skills',
        suggestedText: 'Spring Boot',
        originalText: 'Spring Boot',
      }),
    ).toBe('Spring Boot');
  });
});
