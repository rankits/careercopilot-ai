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
    expect(hasPreviewContent({ ...empty, originalText: 'raw only' })).toBe(false);

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
    expect(serialized).toContain('PROFESSIONAL SUMMARY');
    expect(serialized).toContain('WORK EXPERIENCE');
    expect(serialized).toContain('SKILLS');
    expect(serialized).toContain('Java, Spring Boot');
    expect(getSectionText(draft, 'skills')).toBe('Java, Spring Boot');
  });

  it('creates an experience entry when applying to an empty experience section', () => {
    const draft = createEmptyDraft();
    const next = applyTextReplaceToDraft(
      draft,
      'experience',
      '',
      'Delivered high-impact APIs for JD keywords',
    );
    expect(next.experiences).toHaveLength(1);
    expect(next.experiences[0]?.details).toContain('Delivered high-impact APIs');
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

    expect(
      applyTextReplaceToDraft(draft, 'summary', 'React developer', 'Java developer').summary,
    ).toBe('Java developer');
    expect(applyTextReplaceToDraft(draft, 'skills', '', 'Java, Spring Boot').skillsList).toEqual(
      expect.arrayContaining(['React', 'Java', 'Spring Boot']),
    );
    expect(
      applyTextReplaceToDraft(draft, 'experience', 'Built UI components', 'Built REST APIs')
        .experiences[0]?.details,
    ).toBe('- Built REST APIs');
    expect(
      applyTextReplaceToDraft(draft, 'projects', 'Used React', 'Used React and TypeScript')
        .projectsList[0]?.details,
    ).toBe('- Used React and TypeScript');
  });

  it('applies experience suggestions despite bullet/whitespace drift', () => {
    const draft = {
      ...createEmptyDraft(),
      experiences: [
        {
          id: 'e1',
          company: 'Acme',
          title: 'Dev',
          startDate: '',
          endDate: '',
          details: '- Built UI components\n- Shipped features',
        },
      ],
    };

    const next = applyTextReplaceToDraft(
      draft,
      'experience',
      'Built UI components',
      'Built accessible UI components in React',
    );
    expect(next.experiences[0]?.details).toContain('Built accessible UI components in React');
    expect(next.experiences[0]?.details).toContain('Shipped features');
  });

  it('adds JD skills from prose skill suggestions without dumping narrative', () => {
    const draft = {
      ...createEmptyDraft(),
      skillsList: ['React'],
    };

    const next = applyTextReplaceToDraft(
      draft,
      'skills',
      'React',
      'Add Java, Spring Boot, and Hibernate for ATS keyword match',
    );
    expect(next.skillsList).toEqual(expect.arrayContaining(['React', 'Java', 'Spring Boot']));
    expect(next.skillsList.some((skill) => /keyword|match|for|ATS/i.test(skill))).toBe(false);
  });

  it('adds only the selected single skill', () => {
    const draft = {
      ...createEmptyDraft(),
      skillsList: ['React'],
    };

    const next = applyTextReplaceToDraft(draft, 'skills', 'Java', 'Java');
    expect(next.skillsList).toEqual(['React', 'Java']);
  });

  it('replaces a full skills list rewrite without duplicating on re-apply', () => {
    const draft = {
      ...createEmptyDraft(),
      skillsList: ['React', 'CSS', 'HTML'],
    };
    const original = 'React, CSS, HTML';
    const suggested = 'Java, Spring Boot, Hibernate, Kafka';
    const once = applyTextReplaceToDraft(draft, 'skills', original, suggested);
    expect(once.skillsList).toEqual(
      expect.arrayContaining(['Java', 'Spring Boot', 'Hibernate', 'Kafka']),
    );
    expect(once.skillsList).not.toEqual(expect.arrayContaining(['React', 'CSS', 'HTML']));
    const twice = applyTextReplaceToDraft(once, 'skills', original, suggested);
    expect(twice.skillsList).toEqual(once.skillsList);
  });

  it('replaces summary instead of appending when original is empty', () => {
    const draft = {
      ...createEmptyDraft(),
      summary: 'Old summary about React work.',
    };
    const next = applyTextReplaceToDraft(
      draft,
      'summary',
      '',
      'New summary targeting Java Spring Boot roles.',
    );
    expect(next.summary).toBe('New summary targeting Java Spring Boot roles.');
    expect(next.summary).not.toContain('Old summary');
  });

  it('replaces experience bullets instead of appending duplicates', () => {
    const draft = {
      ...createEmptyDraft(),
      experiences: [
        {
          id: 'e1',
          company: 'Acme',
          title: 'Dev',
          startDate: '',
          endDate: '',
          details: '- Built UI components\n- Shipped features',
        },
      ],
    };

    const next = applyTextReplaceToDraft(
      draft,
      'experience',
      'Built UI comps',
      'Built accessible UI components with React and TypeScript',
    );
    const details = next.experiences[0]?.details ?? '';
    expect(details).toContain('Built accessible UI components with React and TypeScript');
    expect(details).toContain('Shipped features');
    expect(details.match(/Built/gi)?.length ?? 0).toBe(1);
  });

  it('does not duplicate when applying the same experience suggestion twice', () => {
    const draft = {
      ...createEmptyDraft(),
      experiences: [
        {
          id: 'e1',
          company: 'Acme',
          title: 'Dev',
          startDate: '',
          endDate: '',
          details: '- Built REST APIs',
        },
      ],
    };

    const once = applyTextReplaceToDraft(
      draft,
      'experience',
      'Built REST APIs',
      'Built scalable REST APIs with Node.js',
    );
    const twice = applyTextReplaceToDraft(
      once,
      'experience',
      'Built REST APIs',
      'Built scalable REST APIs with Node.js',
    );
    expect(twice.experiences[0]?.details.match(/scalable REST APIs/gi)?.length ?? 0).toBe(1);
  });

  it('does not treat short substrings as already-applied prose', () => {
    const draft = {
      ...createEmptyDraft(),
      summary: 'Backend engineer with Java, Spring Boot, and cloud delivery experience.',
    };
    const next = applyTextReplaceToDraft(
      draft,
      'summary',
      'Backend engineer with Java, Spring Boot, and cloud delivery experience.',
      'Java backend engineer focused on Spring Boot microservices and cloud delivery.',
    );
    expect(next.summary).toBe(
      'Java backend engineer focused on Spring Boot microservices and cloud delivery.',
    );
  });

  it('updates project titles when the suggestion targets the title', () => {
    const draft = {
      ...createEmptyDraft(),
      projectsList: [
        {
          id: 'p1',
          title: 'App',
          company: '',
          startDate: '',
          endDate: '',
          details: '- Built features',
        },
      ],
    };
    const next = applyTextReplaceToDraft(draft, 'projects', 'App', 'ATS Resume Optimizer');
    expect(next.projectsList[0]?.title).toBe('ATS Resume Optimizer');
    expect(next.projectsList[0]?.details).toContain('Built features');
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
