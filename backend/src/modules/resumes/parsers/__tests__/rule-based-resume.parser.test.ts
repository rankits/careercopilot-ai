import { describe, expect, it } from 'vitest';
import { RuleBasedResumeParser } from '@/modules/resumes/parsers/rule-based-resume.parser.js';

describe('RuleBasedResumeParser', () => {
  it('extracts contact details, skills and section lines from raw text', async () => {
    const parser = new RuleBasedResumeParser();
    const text = [
      'Jane Doe',
      'jane@example.com',
      '+1 555 123 4567',
      'https://www.linkedin.com/in/jane-doe',
      'Senior React Developer at Acme',
      'Bachelor of Science, Computer Science',
      'AWS Certified Solutions Architect',
      'Experienced with Typescript, Node, postgresql, Docker',
      '',
    ].join('\n');

    const result = await parser.parseResume({ extractedText: text });

    expect(result.parserVersion).toBe('rule-based-v1');
    expect(result.confidenceScore).toBe(0.45);
    expect(result.data.personalDetails.fullName).toBe('Jane Doe');
    expect(result.data.personalDetails.email).toBe('jane@example.com');
    expect(result.data.personalDetails.phone).toBe('+1 555 123 4567');
    expect(result.data.personalDetails.linkedIn).toBe('https://www.linkedin.com/in/jane-doe');
    expect(result.data.skills).toContain('react');
    expect(result.data.skills).toContain('typescript');
    expect(result.data.skills).toContain('postgresql');
    expect(result.data.skills).toContain('docker');
    expect(result.data.skills).not.toContain('jane');
    expect(result.data.education.some((e) => e.raw.includes('Bachelor'))).toBe(true);
    expect(result.data.experience.some((e) => e.raw.includes('Developer'))).toBe(true);
    expect(result.data.certifications.some((c) => c.raw.includes('AWS Certified'))).toBe(true);
  });

  it('falls back to undefined contact fields and empty arrays when nothing matches', async () => {
    const result = await new RuleBasedResumeParser().parseResume({ extractedText: 'just a name' });
    expect(result.data.personalDetails.email).toBeUndefined();
    expect(result.data.personalDetails.phone).toBeUndefined();
    expect(result.data.personalDetails.linkedIn).toBeUndefined();
    expect(result.data.skills).toEqual([]);
    expect(result.data.education).toEqual([]);
    expect(result.data.experience).toEqual([]);
    expect(result.data.certifications).toEqual([]);
  });

  it('caps education, experience and certification sections', async () => {
    const lines: string[] = [];
    for (let i = 0; i < 20; i++) lines.push(`Engineer ${i}`);
    for (let i = 0; i < 20; i++) lines.push(`B.Tech degree entry ${i}`);
    for (let i = 0; i < 20; i++) lines.push(`Certified pro ${i}`);

    const result = await new RuleBasedResumeParser().parseResume({
      extractedText: lines.join('\n'),
    });
    expect(result.data.experience).toHaveLength(12);
    expect(result.data.education).toHaveLength(10);
    expect(result.data.certifications).toHaveLength(8);
  });
});
