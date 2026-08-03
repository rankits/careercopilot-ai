import { describe, expect, it } from 'vitest';

import type { ResumeProfileFormValues } from '@/features/resume/types/resume.types';

import { getProfileCompletion, getResumePresentation } from './resumePresentation';

describe('resume presentation', () => {
  it('uses parser response values for summary and insight presentation', () => {
    const presentation = getResumePresentation({
      confidenceScore: 0.82,
      extractedData: {
        certifications: [{ name: 'Cloud' }],
        education: [{ institution: 'University' }],
        employmentHistory: [{ company: 'Acme' }, { company: 'Acme' }, { company: 'Globex' }],
        parseQuality: {
          missingImportantFields: ['Portfolio'],
          strengths: ['Relevant experience'],
          suggestions: ['Add measurable outcomes'],
          warnings: ['Education dates need review'],
        },
        projects: [{ name: 'One' }, { name: 'Two' }],
        skills: { technical: ['TypeScript', 'React'], tools: ['Git'] },
      },
    });

    expect(presentation.confidenceScore).toBe(0.82);
    expect(presentation.counts).toEqual({
      certifications: 1,
      companies: 2,
      education: 1,
      projects: 2,
      skills: 3,
    });
    expect(presentation.insights.missingInformation).toEqual(['Portfolio']);
    expect(presentation.insights.areasToImprove).toEqual(['Education dates need review']);
  });

  it('updates completion from editable profile values', () => {
    const values = Object.fromEntries(
      [
        'certifications',
        'currentCompany',
        'designation',
        'education',
        'email',
        'fullName',
        'location',
        'phone',
        'projects',
        'skills',
        'summary',
        'totalExperience',
        'workExperience',
      ].map((key) => [key, '']),
    ) as unknown as ResumeProfileFormValues;

    expect(getProfileCompletion(values)).toBe(0);
    expect(getProfileCompletion({ ...values, email: 'ada@example.com' })).toBe(8);
  });
});
