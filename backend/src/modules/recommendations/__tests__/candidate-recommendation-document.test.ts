import { describe, expect, it } from 'vitest';
import {
  buildProfilePrimaryRecommendationPayload,
  mergeCandidateProfileSources,
} from '@/modules/recommendations/utils/candidate-recommendation-document.js';

describe('candidate recommendation document', () => {
  it('merges profile-primary with resume fallback for missing fields', () => {
    const profile = {
      personalDetails: { currentTitle: 'Staff Engineer', summary: 'Profile summary' },
      skills: ['TypeScript'],
      experience: [],
      education: [],
      certifications: [],
    };
    const resume = {
      personalDetails: { currentTitle: 'Junior Dev', summary: 'Resume summary' },
      skills: ['Go', 'TypeScript'],
      experience: [{ title: 'Backend Engineer' }],
      education: [{ qualification: 'BSc CS' }],
      certifications: [],
      totalExperienceYears: 5,
    };

    const merged = mergeCandidateProfileSources(profile, resume);
    expect(merged.skills).toEqual(['TypeScript', 'Go']);
    expect(merged.experience).toEqual(resume.experience);
    expect(merged.totalExperienceYears).toBe(5);

    const payload = buildProfilePrimaryRecommendationPayload(profile, resume);
    expect(payload.targetTitles).toContain('Staff Engineer');
    expect(payload.requiredSkills).toEqual(['TypeScript', 'Go']);
    expect(payload.sourceText).toBe('Profile summary');
  });

  it('uses profile-only when no resume fallback', () => {
    const profile = {
      personalDetails: { currentTitle: 'Designer' },
      skills: ['Figma'],
      experience: [],
      education: [],
      certifications: [],
    };
    const payload = buildProfilePrimaryRecommendationPayload(profile, null);
    expect(payload.targetTitles).toEqual(['Designer']);
    expect(payload.requiredSkills).toEqual(['Figma']);
  });
});
