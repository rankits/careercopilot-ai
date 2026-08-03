import { describe, expect, it } from 'vitest';
import {
  hasRecommendationSignal,
  toCandidateProfileSourcePayload,
} from '@/modules/recommendations/mappers/candidate-profile-source.mapper.js';

describe('toCandidateProfileSourcePayload', () => {
  it('maps titles, skills, education, and summary from stored JSON', () => {
    const payload = toCandidateProfileSourcePayload({
      personalDetails: {
        currentTitle: 'Backend Engineer',
        seniorityLevel: 'MID',
        location: 'Berlin',
        summary: 'Builds APIs',
      },
      skills: ['TypeScript', 'TypeScript', 'PostgreSQL'],
      experience: [{ title: 'Software Engineer' }, { raw: 'ignored without title' }],
      education: [{ qualification: 'BS', fieldOfStudy: 'CS' }],
      certifications: [{ name: 'AWS CCP' }],
      totalExperienceYears: 4,
      professionalLabels: [
        { category: 'ROLE', label: 'API Developer' },
        { category: 'DOMAIN', label: 'Fintech' },
      ],
    });

    expect(payload.targetTitles).toEqual(['Backend Engineer', 'Software Engineer']);
    expect(payload.relatedTitles).toEqual(['API Developer']);
    expect(payload.requiredSkills).toEqual(['TypeScript', 'PostgreSQL']);
    expect(payload.seniority).toBe('MID');
    expect(payload.locations).toEqual(['Berlin']);
    expect(payload.education).toEqual(['BS CS']);
    expect(payload.certifications).toEqual(['AWS CCP']);
    expect(payload.yearsOfExperience).toBe(4);
    expect(payload.sourceText).toBe('Builds APIs');
    expect(hasRecommendationSignal(payload)).toBe(true);
  });

  it('maps available full-engine profile signals without inventing missing fields', () => {
    const payload = toCandidateProfileSourcePayload({
      personalDetails: {
        designation: 'Staff Frontend Engineer',
        totalExperience: '8',
        location: { city: 'Austin', state: 'TX', country: 'US' },
        preferredLocations: ['Remote US', 'Austin'],
        preferredSkills: 'React, Design Systems',
        preferredRoles: ['UI Platform Engineer'],
        preferredIndustries: ['SaaS'],
        remotePreference: 'remote',
        employmentTypes: ['Full Time', 'Contract'],
        salaryExpectation: { min: '$150,000', max: '190000', currency: 'usd' },
        salaryMinimumNonNegotiable: '140000',
        excludedCompanies: ['Acme'],
        excludedSkills: ['PHP'],
        eligibleCountries: ['US'],
        workAuthorization: 'authorized',
        requiresSponsorship: 'no',
        languages: ['English'],
        summary: 'Leads frontend platform work.',
        projects: [{ name: 'Design System', description: 'Component library' }],
      },
      skills: 'TypeScript, React',
      experience: [{ designation: 'Frontend Engineer' }],
      education: [{ description: 'BS Computer Science' }],
      certifications: [{ description: 'AWS Certified Developer' }],
      professionalLabels: [
        { category: 'TECH_STACK', label: 'Storybook' },
        { category: 'DOMAIN', label: 'Fintech' },
      ],
    });

    expect(payload.targetTitles).toEqual(['Staff Frontend Engineer', 'Frontend Engineer']);
    expect(payload.relatedTitles).toEqual(['UI Platform Engineer']);
    expect(payload.requiredSkills).toEqual(['TypeScript', 'React']);
    expect(payload.preferredSkills).toEqual(['React', 'Design Systems', 'Storybook']);
    expect(payload.industries).toEqual(['SaaS', 'Fintech']);
    expect(payload.locations).toEqual(['Austin, TX, US', 'Remote US', 'Austin']);
    expect(payload.remotePreference).toBe('REMOTE');
    expect(payload.employmentTypes).toEqual(['FULL_TIME', 'CONTRACT']);
    expect(payload.salaryExpectation).toEqual({
      minimum: 150000,
      maximum: 190000,
      currency: 'USD',
    });
    expect(payload.salaryMinimumNonNegotiable).toBe(140000);
    expect(payload.education).toEqual(['BS Computer Science']);
    expect(payload.certifications).toEqual(['AWS Certified Developer']);
    expect(payload.excludedCompanies).toEqual(['Acme']);
    expect(payload.excludedSkills).toEqual(['PHP']);
    expect(payload.eligibleCountries).toEqual(['US']);
    expect(payload.workAuthorization).toBe('AUTHORIZED');
    expect(payload.requiresSponsorship).toBe(false);
    expect(payload.languages).toEqual(['English']);
    expect(payload.sourceText).toContain('Leads frontend platform work.');
    expect(payload.sourceText).toContain('Design System Component library');
  });

  it('reports no signal for empty profiles', () => {
    const payload = toCandidateProfileSourcePayload({
      personalDetails: {},
      skills: [],
      experience: [],
      education: [],
      certifications: [],
    });
    expect(hasRecommendationSignal(payload)).toBe(false);
  });
});
