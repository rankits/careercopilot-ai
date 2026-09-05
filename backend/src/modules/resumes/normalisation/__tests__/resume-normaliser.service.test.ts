import { describe, expect, it } from 'vitest';
import { resumeNormaliserService } from '@/modules/resumes/normalisation/resume-normaliser.service.js';
import { ParsedResumeData } from '@/modules/resumes/types/resume.types.js';

const base = (overrides: Record<string, unknown> = {}): ParsedResumeData =>
  ({
    personalDetails: { fullName: '  Jane   Doe  ' },
    experience: [],
    projects: [],
    education: [],
    skills: ['React', 'react', ' Node '],
    certifications: [],
    professionalLabels: [],
    totalExperienceMonths: 0,
    totalExperienceYears: 0,
    ...overrides,
  }) as unknown as ParsedResumeData;

describe('resumeNormaliserService.normalize', () => {
  it('normalizes text, dedupes/sorts skills and handles empty experience', () => {
    const out = resumeNormaliserService.normalize(base());
    expect(out.personalDetails.fullName).toBe('Jane Doe');
    expect(out.skills).toEqual(['Node.js', 'React']);
    expect(out.totalExperienceMonths).toBe(0);
    expect(out.totalExperienceYears).toBe(0);
  });

  it('computes merged experience months across overlapping and current periods', () => {
    const out = resumeNormaliserService.normalize(
      base({
        experience: [
          { companyName: 'A', startDate: '2019-01', endDate: '2020-06' },
          { companyName: 'B', startDate: '2020-01', endDate: '2021-03' },
          { companyName: 'C', startDate: '2022-01', endDate: '2023-02' },
          { companyName: 'Current', startDate: '2024-01', isCurrent: true },
        ],
      }),
    );
    expect(out.totalExperienceMonths).toBeGreaterThan(0);
    expect(out.experience).toHaveLength(4);
  });

  it('uses currentDate when endDate is absent or not a string', () => {
    const out = resumeNormaliserService.normalize(
      base({ experience: [{ startDate: '2023-01', endDate: null }] }),
    );
    expect(out.totalExperienceMonths).toBeGreaterThan(0);
  });

  it('filters periods whose end precedes start', () => {
    const out = resumeNormaliserService.normalize(
      base({ experience: [{ startDate: '2021-01', endDate: '2020-01' }] }),
    );
    expect(out.totalExperienceMonths).toBe(0);
  });

  it('throws on a malformed date', () => {
    expect(() =>
      resumeNormaliserService.normalize(
        base({ experience: [{ startDate: 'junk', endDate: '2020-01' }] }),
      ),
    ).toThrow('Invalid YYYY-MM date');
  });

  it('derives experience from declared months, declared years and stated years', () => {
    const out = resumeNormaliserService.normalize(
      base({
        totalExperienceMonths: 40,
        totalExperienceYears: 6,
        personalDetails: { summary: '8 years of experience building products' },
      }),
    );
    // max(0, 40, 72, 96) = 96
    expect(out.totalExperienceMonths).toBe(96);
    expect(out.totalExperienceYears).toBe(8);
  });

  it('ignores an out-of-range stated-years value', () => {
    const out = resumeNormaliserService.normalize(
      base({ personalDetails: { summary: '99 years of experience' } }),
    );
    expect(out.totalExperienceMonths).toBe(0);
  });

  it('reads summary from the professional profile when personal details lack it', () => {
    const out = resumeNormaliserService.normalize(
      base({ professionalProfile: { summary: ' 5+ yrs experience leading teams ' } }),
    );
    expect(out.totalExperienceMonths).toBe(60);
    expect(out.professionalProfile?.totalExperienceMonths).toBe(60);
  });

  it('handles non-record personalDetails and professionalProfile', () => {
    const out = resumeNormaliserService.normalize(
      base({ personalDetails: null, professionalProfile: null }),
    );
    expect(out.personalDetails).toEqual({});
    expect(out.professionalProfile).toBeNull();
  });

  it('normalizes nested records and arrays inside records', () => {
    const out = resumeNormaliserService.normalize(
      base({
        personalDetails: {
          name: 'X',
          skillsList: ['  a ', ' b '],
          nested: { note: ' hi ' },
          number: 5,
        },
      }),
    );
    expect(out.personalDetails.nested).toEqual({ note: 'hi' });
    expect(out.personalDetails.skillsList).toEqual(['a', 'b']);
    expect(out.personalDetails.number).toBe(5);
  });

  it('omits non-array sections and normalizes the rest', () => {
    const out = resumeNormaliserService.normalize(
      base({
        professionalLabels: null,
        projects: null,
        languages: null,
        links: { linkedIn: 'https://x' },
      }),
    );
    expect(out.professionalLabels).toBeUndefined();
    expect(out.projects).toBeUndefined();
    expect(out.links?.linkedIn).toBe('https://x');
  });
});
