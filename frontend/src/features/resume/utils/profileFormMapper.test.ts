import { describe, expect, it } from 'vitest';

import type {
  CandidateProfileData,
  ResumeProfileFormValues,
} from '@/features/resume/types/resume.types';

import { mapFormValuesToProfileUpdate, mapProfileToFormValues } from './profileFormMapper';

const baseProfile: CandidateProfileData = {
  certifications: [],
  education: [],
  experience: [],
  isComplete: true,
  personalDetails: {},
  skills: [],
  sourceResumeId: null,
  userId: 'user-1',
};

describe('mapProfileToFormValues', () => {
  it('maps structured records to flattened, human-readable lines', () => {
    const values = mapProfileToFormValues({
      ...baseProfile,
      certifications: [{ issuer: 'Amazon', name: 'AWS Certified' }],
      education: [{ institution: 'MIT', qualification: 'B.Tech' }],
      experience: [{ company: 'Acme', title: 'Engineer' }],
      personalDetails: {
        currentCompany: 'Acme',
        designation: 'Engineer',
        email: 'ada@example.com',
        fullName: 'Ada Lovelace',
        location: 'London',
        phone: '+44 1234',
        summary: 'Computing pioneer',
        totalExperience: 8,
      },
      skills: ['TypeScript', 'React'],
    });

    expect(values.email).toBe('ada@example.com');
    expect(values.fullName).toBe('Ada Lovelace');
    expect(values.totalExperience).toBe('8');
    expect(values.skills).toBe('TypeScript, React');
    expect(values.education).toBe('B.Tech — MIT');
    expect(values.workExperience).toBe('Engineer — Acme');
    expect(values.certifications).toBe('AWS Certified — Amazon');
  });

  // A RULE_BASED (non-AI) parse can't reliably split a resume section into
  // discrete fields, so it persists the entry as one unstructured line
  // under `raw` instead of `title`/`company`/`qualification`/etc. Before
  // the `raw` fallback, those entries silently disappeared from the edit
  // form even though the profile genuinely had the data.
  it('falls back to the raw line when an entry has no structured fields', () => {
    const values = mapProfileToFormValues({
      ...baseProfile,
      certifications: [{ raw: 'AWS Certified Solutions Architect' }],
      education: [{ raw: 'B.Tech in Information Technology, MIT, 2021' }],
      experience: [
        { raw: 'Full Stack Developer at Acme (2023 - Present)' },
        { raw: 'Frontend Developer at Globex (2022 - 2023)' },
      ],
      personalDetails: { email: 'ajay@example.com', fullName: 'Ajay', phone: '+91 1234567890' },
    });

    expect(values.workExperience).toBe(
      'Full Stack Developer at Acme (2023 - Present)\nFrontend Developer at Globex (2022 - 2023)',
    );
    expect(values.education).toBe('B.Tech in Information Technology, MIT, 2021');
    expect(values.certifications).toBe('AWS Certified Solutions Architect');
  });

  it('prefers structured fields over raw when both are present', () => {
    const values = mapProfileToFormValues({
      ...baseProfile,
      experience: [{ company: 'Acme', raw: 'ignored raw text', title: 'Engineer' }],
    });

    expect(values.workExperience).toBe('Engineer — Acme');
  });

  it('leaves fields blank rather than throwing when personalDetails and arrays are empty', () => {
    const values = mapProfileToFormValues(baseProfile);

    expect(values).toMatchObject({
      certifications: '',
      designation: '',
      education: '',
      skills: '',
      summary: '',
      totalExperience: '',
      workExperience: '',
    });
  });
});

describe('mapFormValuesToProfileUpdate', () => {
  it('splits multi-line free text back into one record per non-empty line', () => {
    const values: ResumeProfileFormValues = {
      certifications: 'AWS Certified\n\nGCP Certified',
      currentCompany: 'Acme',
      designation: 'Engineer',
      education: 'B.Tech — MIT',
      email: 'ada@example.com',
      fullName: 'Ada Lovelace',
      location: 'London',
      phone: '+44 1234',
      projects: '',
      skills: 'TypeScript, React,  ,Node.js',
      summary: 'Computing pioneer',
      totalExperience: '8',
      workExperience: 'Engineer — Acme',
    };

    const payload = mapFormValuesToProfileUpdate(values);

    expect(payload.certifications).toEqual([
      { description: 'AWS Certified' },
      { description: 'GCP Certified' },
    ]);
    expect(payload.education).toEqual([{ description: 'B.Tech — MIT' }]);
    expect(payload.experience).toEqual([{ description: 'Engineer — Acme' }]);
    expect(payload.skills).toEqual(['TypeScript', 'React', 'Node.js']);
    expect(payload.personalDetails).toMatchObject({
      email: 'ada@example.com',
      fullName: 'Ada Lovelace',
    });
  });
});
