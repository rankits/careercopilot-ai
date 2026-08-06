import { describe, expect, it } from 'vitest';

import { alignDraftToJob } from './align';
import { createEmptyDraft } from './draft';

describe('align utils', () => {
  it('keeps evidenced JD skills but does not invent preferred skills', () => {
    const draft = {
      ...createEmptyDraft('Java Developer'),
      summary: 'Backend engineer with Java and Spring Boot experience.',
      skillsList: ['React'],
      experiences: [
        {
          id: '1',
          company: 'Acme',
          title: 'Engineer',
          startDate: '2022',
          endDate: 'Present',
          details: 'Built APIs with Java and Spring Boot',
        },
      ],
      projectsList: [],
    };

    const aligned = alignDraftToJob(draft, {
      preferredSkills: ['TypeScript'],
      matchedSkills: ['Java'],
      recommendedSkills: ['Kotlin'],
      jobDescription: 'Looking for Java Spring Boot engineers',
    });

    expect(aligned.skillsList).toEqual(expect.arrayContaining(['Java', 'React']));
    expect(aligned.skillsList.some((skill) => skill.toLowerCase() === 'typescript')).toBe(false);
    expect(aligned.skillsList.some((skill) => skill.toLowerCase() === 'kotlin')).toBe(false);
  });

  it('swaps summary when current summary misses JD keywords', () => {
    const draft = {
      ...createEmptyDraft('Java Developer'),
      summary: 'Passionate frontend React developer crafting beautiful UIs.',
    };

    const optimized =
      'Java backend engineer with Spring Boot and microservices experience across production systems.';

    const aligned = alignDraftToJob(draft, {
      jobDescription: 'Need Java Spring Boot microservices experience',
      optimizedSummary: optimized,
    });

    expect(aligned.summary).toBe(optimized);
  });

  it('sets subtitle role from targetRole for cross-field JD', () => {
    const draft = {
      ...createEmptyDraft(),
      role: 'Registered Nurse',
    };

    const aligned = alignDraftToJob(draft, {
      targetRole: 'Software Engineer',
      jobDescription: 'Need React and TypeScript engineers',
    });

    expect(aligned.role).toBe('Software Engineer');
  });
});
