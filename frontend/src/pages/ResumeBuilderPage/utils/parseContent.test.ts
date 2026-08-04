import { describe, expect, it } from 'vitest';

import { parseResumeContent } from './parseContent';

const SAMPLE_RESUME = `
Alex Rivera
Java Developer
alex@example.com
+91 98765 43210
Indore, India
linkedin.com/in/alex

PROFESSIONAL SUMMARY
Experienced engineer passionate about building Java Spring Boot APIs and microservices for production systems.

WORK EXPERIENCE
Acme Technologies - Software Engineer
Jan 2022 - Present
- Built REST APIs with Java and Spring Boot
- Collaborated with product teams on delivery

SKILLS
Java, Spring Boot, React, TypeScript, Docker

PROJECTS
CareerCopilot
Built an ATS resume optimizer with React

EDUCATION
B.Tech Computer Science, 2021

CERTIFICATIONS
AWS Cloud Practitioner

ACHIEVEMENTS
Hackathon winner 2023
`;

describe('parseResumeContent', () => {
  it('returns empty draft for blank content', () => {
    const draft = parseResumeContent('');
    expect(draft.fullName).toBe('');
    expect(draft.skillsList).toEqual([]);
  });

  it('parses contact, sections, skills, and experience', () => {
    const draft = parseResumeContent(SAMPLE_RESUME, 'Java Developer');

    expect(draft.fullName).toContain('Alex');
    expect(draft.email).toBe('alex@example.com');
    expect(draft.phone).toContain('98765');
    expect(draft.location).toMatch(/Indore/i);
    expect(draft.linkedin).toContain('linkedin.com');
    expect(draft.summary.toLowerCase()).toContain('spring boot');
    expect(draft.skillsList).toEqual(
      expect.arrayContaining(['Java', 'Spring Boot', 'React', 'TypeScript', 'Docker']),
    );
    expect(draft.experiences.length).toBeGreaterThan(0);
    expect(draft.projectsList.length).toBeGreaterThan(0);
    expect(draft.education).toMatch(/Computer Science/i);
    expect(draft.certifications).toMatch(/AWS/i);
    expect(draft.achievements).toMatch(/Hackathon/i);
    expect(draft.originalText).toContain('Alex Rivera');
  });

  it('falls back to target role when headline is missing', () => {
    const draft = parseResumeContent(
      `Alex Rivera
alex@example.com

SUMMARY
Experienced engineer passionate about building reliable systems and learning new tools every day.

SKILLS
Java, Python
`,
      'Backend Engineer',
    );

    expect(draft.role).toBe('Backend Engineer');
  });
});
