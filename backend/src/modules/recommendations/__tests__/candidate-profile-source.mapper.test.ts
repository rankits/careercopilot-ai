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
