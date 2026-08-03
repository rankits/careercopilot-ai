import { describe, expect, it } from 'vitest';
import { resumeAnalysisAiSchema } from '@/modules/resume-analysis/ai/resume-analysis-ai.schema.js';

describe('resumeAnalysisAiSchema', () => {
  it('parses a minimal valid AI payload', () => {
    const parsed = resumeAnalysisAiSchema.parse({
      atsScore: 70.4,
      keywordMatch: 60,
      skillMatch: 55,
      contentQuality: 65,
      readability: 70,
      formattingScore: 80,
      strengths: ['Clear summary'],
      weaknesses: ['Missing JD skills'],
      missingKeywords: [{ term: 'Java', importance: 'high', reason: 'Required by JD' }],
      missingSkills: ['Java'],
      matchedKeywords: [{ term: 'React', importance: 'high' }],
      skillAnalysis: {
        matchedSkills: ['React'],
        missingSkills: ['Java'],
        transferableSkills: [],
        recommendedSkills: ['Java'],
      },
      sectionScores: {
        summary: 70,
        experience: 65,
        skills: 50,
        education: 80,
        projects: 60,
        achievements: 40,
      },
      atsIssues: [],
      suggestions: [
        {
          id: 'suggestion-1',
          title: 'Add Java',
          category: 'skills',
          originalText: 'React',
          suggestedText: 'Java, React',
          impact: 'HIGH',
          reason: 'JD match',
        },
      ],
      optimizedSections: {
        professionalSummary: 'Java-focused engineer',
        skills: ['Java', 'React'],
        experienceBullets: [],
        projectBullets: [],
      },
      optimizedResumeText: 'PROFESSIONAL SUMMARY\nJava engineer\nSKILLS\nJava, React',
    });

    expect(parsed.atsScore).toBe(70);
    expect(parsed.skillAnalysis.missingSkills).toContain('Java');
  });
});
