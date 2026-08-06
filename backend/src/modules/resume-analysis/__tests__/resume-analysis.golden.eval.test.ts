import { describe, expect, it } from 'vitest';
import { scoreEditedResume } from '@/modules/resume-analysis/utils/ats-score.js';
import { tryRepairJson, extractJsonObject } from '@/modules/resume-analysis/ai/json-repair.js';
import { resumeAnalysisAiSchema } from '@/modules/resume-analysis/ai/resume-analysis-ai.schema.js';

/**
 * Golden-set / eval fixtures for the resume analyzer.
 * These are deterministic checks (no live LLM) that pin expected behavior for:
 * - ATS re-score after applying JD keywords
 * - JSON repair of truncated model output
 * - Schema acceptance of a known-good AI payload
 */

const FRONTEND_RESUME = `
Jane Doe
Frontend Engineer

SUMMARY
React developer shipping accessible product UI.

EXPERIENCE
Acme Corp — Frontend Engineer
2021 – Present
- Built design system components in React
- Partnered with design on accessibility

SKILLS
React, JavaScript, CSS, HTML

EDUCATION
B.S. Computer Science
`.trim();

const FRONTEND_JD =
  'Looking for a Frontend Engineer with React, TypeScript, and accessibility experience.';

const GOLDEN_AI_OUTPUT = {
  atsScore: 68,
  keywordMatch: 60,
  skillMatch: 55,
  contentQuality: 70,
  readability: 72,
  formattingScore: 80,
  experienceRelevance: 65,
  resumeStrength: 70,
  industryAlignment: 60,
  recruiterReadability: 72,
  interviewReadiness: 60,
  strengths: ['Clear experience bullets', 'Relevant React background'],
  weaknesses: ['Missing TypeScript'],
  matchedKeywords: [{ term: 'React', importance: 'high' }],
  missingKeywords: [
    { term: 'TypeScript', importance: 'high', reason: 'Required in JD' },
    { term: 'accessibility', importance: 'medium', reason: 'Mentioned in JD' },
  ],
  skillAnalysis: {
    matchedSkills: ['React', 'JavaScript'],
    missingSkills: ['TypeScript'],
    transferableSkills: ['CSS'],
    additionalSkills: [],
    recommendedSkills: ['TypeScript', 'accessibility'],
  },
  sectionScores: {
    summary: 65,
    experience: 70,
    skills: 55,
    education: 60,
    projects: 20,
    achievements: 10,
  },
  atsIssues: [
    {
      issue: 'Missing TypeScript keyword',
      section: 'skills',
      severity: 'HIGH',
      fix: 'Add TypeScript to skills if you have used it',
    },
  ],
  suggestions: [
    {
      title: 'Add TypeScript',
      category: 'skills',
      originalText: 'React, JavaScript, CSS, HTML',
      suggestedText: 'React, TypeScript, JavaScript, CSS, HTML',
      impact: 'HIGH',
      reason: 'JD requires TypeScript',
    },
  ],
  optimizedSections: {
    professionalSummary:
      'Frontend engineer with React experience building accessible product interfaces.',
    skills: ['React', 'TypeScript', 'JavaScript', 'CSS', 'HTML'],
    experienceBullets: [
      {
        originalText: 'Built design system components in React',
        optimizedText: 'Built accessible design system components in React',
      },
    ],
    projectBullets: [],
  },
  optimizedResumeText: FRONTEND_RESUME.replace(
    'React, JavaScript, CSS, HTML',
    'React, TypeScript, JavaScript, CSS, HTML',
  ),
  improvedSummary:
    'Frontend engineer with React experience building accessible product interfaces.',
  additionalSkillsFound: [],
};

describe('resume analyzer golden set', () => {
  it('accepts a known-good AI analysis payload via schema', () => {
    const parsed = resumeAnalysisAiSchema.safeParse(GOLDEN_AI_OUTPUT);
    expect(parsed.success).toBe(true);
  });

  it('raises ATS score after applying the golden skill suggestion', () => {
    const baseline = scoreEditedResume({
      content: FRONTEND_RESUME,
      baselineAtsScore: 55,
      jobDescription: FRONTEND_JD,
      targetRole: 'Frontend Engineer',
      keywords: [
        { term: 'React', status: 'MATCHED', importance: 'HIGH' },
        { term: 'TypeScript', status: 'MISSING', importance: 'HIGH' },
      ],
      skillAnalysis: GOLDEN_AI_OUTPUT.skillAnalysis,
      appliedSuggestions: [],
    });

    const improvedContent = FRONTEND_RESUME.replace(
      'React, JavaScript, CSS, HTML',
      'React, TypeScript, JavaScript, CSS, HTML',
    );

    const after = scoreEditedResume({
      content: improvedContent,
      baselineAtsScore: baseline.atsScore,
      jobDescription: FRONTEND_JD,
      targetRole: 'Frontend Engineer',
      keywords: [
        { term: 'React', status: 'MATCHED', importance: 'HIGH' },
        { term: 'TypeScript', status: 'MISSING', importance: 'HIGH' },
      ],
      skillAnalysis: {
        ...GOLDEN_AI_OUTPUT.skillAnalysis,
        matchedSkills: ['React', 'JavaScript', 'TypeScript'],
        missingSkills: [],
      },
      appliedSuggestions: [
        {
          category: 'skills',
          originalText: 'React, JavaScript, CSS, HTML',
          suggestedText: 'React, TypeScript, JavaScript, CSS, HTML',
          impact: 'HIGH',
        },
      ],
    });

    expect(after.atsScore).toBeGreaterThanOrEqual(baseline.atsScore);
    expect(after.skillMatch).toBeGreaterThanOrEqual(baseline.skillMatch);
  });

  it('repairs truncated golden model JSON into a parseable object', () => {
    const truncated = `Here is the analysis:\n{"atsScore":68,"keywordMatch":60,"skillMatch":55,"strengths":["Clear experience"`;
    const repaired = tryRepairJson(truncated);
    expect(() => JSON.parse(repaired)).not.toThrow();
    const obj = JSON.parse(repaired) as { atsScore: number };
    expect(obj.atsScore).toBe(68);
  });

  it('extracts the first JSON object from preamble noise', () => {
    const noisy = `Safety note...\n${JSON.stringify({ atsScore: 70, ok: true })}\nThanks`;
    const extracted = extractJsonObject(noisy);
    expect(JSON.parse(extracted)).toEqual({ atsScore: 70, ok: true });
  });

  it('flags a cross-domain resume as low skill match against an unrelated JD', () => {
    const nurseResume = `
Pat Smith
Registered Nurse

EXPERIENCE
City Hospital — RN
- Patient care and triage

SKILLS
Patient care, Triage, EHR
`.trim();

    const scored = scoreEditedResume({
      content: nurseResume,
      baselineAtsScore: 40,
      jobDescription: FRONTEND_JD,
      targetRole: 'Frontend Engineer',
      keywords: [
        { term: 'React', status: 'MISSING', importance: 'HIGH' },
        { term: 'TypeScript', status: 'MISSING', importance: 'HIGH' },
      ],
      skillAnalysis: {
        matchedSkills: [],
        missingSkills: ['React', 'TypeScript'],
        transferableSkills: [],
        recommendedSkills: ['React', 'TypeScript'],
      },
      appliedSuggestions: [],
    });

    expect(scored.skillMatch).toBeLessThan(25);
  });
});
