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
      projects: 'Bernoulli Engine — Algorithm implementation',
      skills: 'Algorithms, Git, Leadership, Computing',
      summary: 'Computing pioneer',
      totalExperience: '8',
      workExperience: 'Engineer — Analytical Engines',
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
