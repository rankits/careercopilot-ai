import { describe, expect, it } from 'vitest';

import {
  applyTextReplaceToDraft,
  createEmptyCustomField,
  createEmptyDraft,
  createEmptyExperience,
  createEmptyProject,
  getSectionText,
  hasPreviewContent,
  normalizeSuggestionCategory,
  serializeResumeDraft,
} from './draft';

describe('draft utils', () => {
  it('creates empty draft structures with ids', () => {
    expect(createEmptyDraft('Java Developer').role).toBe('Java Developer');
    expect(createEmptyExperience().id).toBeTruthy();
    expect(createEmptyProject().id).toBeTruthy();
    expect(createEmptyCustomField().id).toBeTruthy();
  });

  it('detects preview content and serializes draft', () => {
    const empty = createEmptyDraft();
    expect(hasPreviewContent(empty)).toBe(false);

    const draft = {
      ...createEmptyDraft('Engineer'),
      fullName: 'Alex Rivera',
      email: 'alex@example.com',
      summary: 'Backend engineer',
      skillsList: ['Java', 'Spring Boot'],
      experiences: [
        {
          id: 'e1',
          company: 'Acme',
          title: 'Engineer',
          startDate: '2022',
          endDate: 'Present',
          details: 'Built APIs\nOwned services',
        },
      ],
      projectsList: [
        {
          id: 'p1',
          title: 'CareerCopilot',
          company: '',
          startDate: '',
          endDate: '',
          details: 'ATS resume optimizer',
        },
      ],
    };

    expect(hasPreviewContent(draft)).toBe(true);
    const serialized = serializeResumeDraft(draft);
    expect(serialized).toContain('Alex Rivera');
    expect(serialized).toContain('SUMMARY');
    expect(serialized).toContain('SKILLS');
    expect(serialized).toContain('Java, Spring Boot');
    expect(getSectionText(draft, 'skills')).toBe('Java, Spring Boot');
  });

  it('applies suggestion replacements by section', () => {
    const draft = {
      ...createEmptyDraft(),
      summary: 'React developer',
      skillsList: ['React'],
      experiences: [
        {
          id: 'e1',
          company: 'Acme',
          title: 'Dev',
          startDate: '',
          endDate: '',
          details: 'Built UI components',
        },
      ],
      projectsList: [
        {
          id: 'p1',
          title: 'App',
          company: '',
          startDate: '',
          endDate: '',
          details: 'Used React',
        },
      ],
    };

    expect(applyTextReplaceToDraft(draft, 'summary', 'React developer', 'Java developer').summary).toBe(
      'Java developer',
    );
    expect(
      applyTextReplaceToDraft(draft, 'skills', '', 'Java, Spring Boot').skillsList,
    ).toEqual(expect.arrayContaining(['React', 'Java', 'Spring Boot']));
    expect(
      applyTextReplaceToDraft(draft, 'experience', 'Built UI components', 'Built REST APIs')
        .experiences[0].details,
    ).toBe('Built REST APIs');
    expect(
      applyTextReplaceToDraft(draft, 'projects', 'Used React', 'Used React and TypeScript')
        .projectsList[0].details,
    ).toBe('Used React and TypeScript');
  });

  it('normalizes suggestion categories', () => {
    expect(normalizeSuggestionCategory('Profile Summary')).toBe('summary');
    expect(normalizeSuggestionCategory('work experience')).toBe('experience');
    expect(normalizeSuggestionCategory('Skills gap')).toBe('skills');
    expect(normalizeSuggestionCategory('Education polish')).toBe('education');
    expect(normalizeSuggestionCategory('Project rewrite')).toBe('projects');
    expect(normalizeSuggestionCategory('Certification tip')).toBe('certifications');
    expect(normalizeSuggestionCategory('Award mention')).toBe('achievements');
    expect(normalizeSuggestionCategory('misc')).toBe('other');
  });
});
