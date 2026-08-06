import { describe, expect, it } from 'vitest';

import { mapResumeToProfile } from './mapResumeToProfile';

const parsedResume = {
  personalInformation: {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+44 1234',
    location: { city: 'London', state: null, country: 'UK', postalCode: null },
  },
  professionalSummary: 'Computing pioneer',
  currentPosition: { company: 'Analytical Engines', title: 'Engineer' },
  totalExperienceYears: 8,
  skills: {
    technical: ['Algorithms'],
    tools: ['Git'],
    frameworks: [],
    softSkills: ['Leadership'],
    domains: ['Computing'],
  },
  education: [{ institution: 'University of London', qualification: 'Mathematics' }],
  certifications: [{ name: 'Advanced Computing', issuer: 'Babbage Institute' }],
  employmentHistory: [{ company: 'Analytical Engines', title: 'Engineer' }],
  projects: [{ name: 'Bernoulli Engine', description: 'Algorithm implementation' }],
};

describe('mapResumeToProfile', () => {
  it('maps every supported parser field into editable form values', () => {
    expect(mapResumeToProfile(parsedResume)).toEqual({
      certifications: 'Advanced Computing — Babbage Institute',
      currentCompany: 'Analytical Engines',
      designation: 'Engineer',
      education: 'Mathematics — University of London',
      email: 'ada@example.com',
      fullName: 'Ada Lovelace',
      location: 'London, UK',
      phone: '+44 1234',
      projects: 'Bernoulli Engine\nDescription: Algorithm implementation',
      skills: 'Algorithms, Git, Leadership, Computing',
      summary: 'Computing pioneer',
      totalExperience: '8',
      workExperience: 'Engineer — Analytical Engines',
    });
  });

  it('maps stored ParsedResumeData (AI normaliser output) into required form fields', () => {
    expect(
      mapResumeToProfile({
        personalDetails: {
          fullName: 'Ada Lovelace',
          email: 'ada@example.com',
          phone: '+44 1234',
          location: 'London',
          summary: 'Computing pioneer',
          currentTitle: 'Engineer',
          currentCompany: 'Analytical Engines',
        },
        professionalProfile: {
          summary: 'Computing pioneer',
          currentTitle: 'Engineer',
          totalExperienceYears: 8,
        },
        experience: [{ company: 'Analytical Engines', title: 'Engineer' }],
        education: [{ institution: 'University of London', qualification: 'Mathematics' }],
        skills: ['Algorithms', 'Git'],
        certifications: [{ name: 'Advanced Computing', issuer: 'Babbage Institute' }],
        projects: [{ name: 'Bernoulli Engine', description: 'Algorithm implementation' }],
        totalExperienceYears: 8,
      }),
    ).toMatchObject({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+44 1234',
      designation: 'Engineer',
      currentCompany: 'Analytical Engines',
      totalExperience: '8',
      skills: 'Algorithms, Git',
      summary: 'Computing pioneer',
      workExperience: 'Engineer — Analytical Engines',
    });
  });

  it('keeps RULE_BASED raw section lines instead of dropping them', () => {
    expect(
      mapResumeToProfile({
        personalDetails: { fullName: 'Ada Lovelace', email: 'ada@example.com', phone: '+44 1234' },
        experience: [{ raw: 'Engineer at Analytical Engines' }],
        education: [{ raw: 'Mathematics — University of London' }],
        skills: ['Algorithms'],
        certifications: [{ raw: 'Advanced Computing' }],
      }),
    ).toMatchObject({
      workExperience: 'Engineer at Analytical Engines',
      education: 'Mathematics — University of London',
      certifications: 'Advanced Computing',
      skills: 'Algorithms',
    });
  });

  it('returns safe empty values for missing or partial fields', () => {
    expect(mapResumeToProfile({ personalInformation: { fullName: 'Ada' } })).toMatchObject({
      fullName: 'Ada',
      email: '',
      skills: '',
      education: '',
      workExperience: '',
    });
  });

  it('rejects empty and invalid parser responses', () => {
    expect(() => mapResumeToProfile(null)).toThrow('Resume parser returned an invalid response.');
    expect(() => mapResumeToProfile({})).toThrow('Resume parser returned an empty response.');
  });
});
