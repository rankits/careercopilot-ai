import { describe, expect, it } from 'vitest';
import { scoreEditedResume } from '@/modules/resume-analysis/utils/ats-score.js';
import { termAppearsIn } from '@/modules/resume-analysis/utils/text-match.js';

const baseSkills = {
  matchedSkills: ['React', 'TypeScript'],
  missingSkills: ['Java', 'Spring Boot', 'Hibernate'],
  transferableSkills: [],
  recommendedSkills: ['Java', 'Spring Boot'],
};

const baseKeywords = [
  { term: 'React', status: 'MATCHED', importance: 'high' },
  { term: 'TypeScript', status: 'MATCHED', importance: 'medium' },
  { term: 'Java', status: 'MISSING', importance: 'high' },
  { term: 'Spring Boot', status: 'MISSING', importance: 'high' },
  { term: 'Hibernate', status: 'MISSING', importance: 'medium' },
];

const sampleResume = `
PROFESSIONAL SUMMARY
Full-stack engineer with React experience.

EXPERIENCE
Software Engineer at Acme
Built React dashboards with TypeScript.

SKILLS
React, TypeScript, CSS

EDUCATION
B.Tech Computer Science
`;

describe('termAppearsIn', () => {
  it('matches multi-word and special tech tokens', () => {
    expect(termAppearsIn('Used Spring Boot and C++ daily', 'Spring Boot')).toBe(true);
    expect(termAppearsIn('Used Spring Boot and C++ daily', 'C++')).toBe(true);
    expect(termAppearsIn('Worked with .NET Core', '.NET')).toBe(true);
    expect(termAppearsIn('Node.js services', 'Node.js')).toBe(true);
  });

  it('does not false-positive on partial tokens', () => {
    expect(termAppearsIn('JavaScript developer', 'Java')).toBe(false);
  });
});

describe('scoreEditedResume', () => {
  it('keeps score near baseline when content is unchanged', () => {
    const scored = scoreEditedResume({
      content: sampleResume,
      baselineAtsScore: 68,
      jobDescription: 'Need Java Spring Boot developer',
      targetRole: 'Java Developer',
      keywords: baseKeywords,
      skillAnalysis: baseSkills,
      appliedSuggestions: [],
    });

    expect(scored.atsScore).toBeGreaterThanOrEqual(60);
    expect(scored.atsScore).toBeLessThanOrEqual(72);
  });

  it('raises ATS score when missing JD skills and applied suggestions land in content', () => {
    const improved = `
PROFESSIONAL SUMMARY
Java developer with Spring Boot and Hibernate experience plus React.

EXPERIENCE
Software Engineer at Acme
Built React dashboards with TypeScript and migrated services to Java Spring Boot.

SKILLS
Java, Spring Boot, Hibernate, React, TypeScript, CSS

EDUCATION
B.Tech Computer Science
`;

    const baseline = scoreEditedResume({
      content: sampleResume,
      baselineAtsScore: 62,
      jobDescription: 'Need Java Spring Boot Hibernate developer',
      targetRole: 'Java Developer',
      keywords: baseKeywords,
      skillAnalysis: baseSkills,
      appliedSuggestions: [],
    });

    const after = scoreEditedResume({
      content: improved,
      baselineAtsScore: 62,
      jobDescription: 'Need Java Spring Boot Hibernate developer',
      targetRole: 'Java Developer',
      keywords: baseKeywords,
      skillAnalysis: baseSkills,
      appliedSuggestions: [
        {
          category: 'skills',
          originalText: 'React, TypeScript, CSS',
          suggestedText: 'Java, Spring Boot, Hibernate, React, TypeScript, CSS',
          impact: 'HIGH',
        },
        {
          category: 'summary',
          originalText: 'Full-stack engineer with React experience.',
          suggestedText: 'Java developer with Spring Boot and Hibernate experience plus React.',
          impact: 'HIGH',
        },
      ],
    });

    expect(after.atsScore).toBeGreaterThan(baseline.atsScore);
    expect(after.atsScore).toBeGreaterThanOrEqual(74);
    expect(after.atsScore).toBeLessThanOrEqual(94);
    expect(after.keywordMatch).toBeGreaterThan(baseline.keywordMatch);
    expect(after.skillMatch).toBeGreaterThan(baseline.skillMatch);
  });

  it('reaches mid/high 70s from a low baseline when all skills match and suggestions are applied', () => {
    const improved = `
PROFESSIONAL SUMMARY
Java developer with Spring Boot and Hibernate experience plus React.

EXPERIENCE
Software Engineer at Acme
Built React dashboards with TypeScript and migrated services to Java Spring Boot.

SKILLS
Java, Spring Boot, Hibernate, React, TypeScript, CSS

EDUCATION
B.Tech Computer Science
`;

    const after = scoreEditedResume({
      content: improved,
      baselineAtsScore: 40,
      jobDescription: 'Need Java Spring Boot Hibernate developer',
      targetRole: 'Java Developer',
      keywords: baseKeywords,
      skillAnalysis: baseSkills,
      appliedSuggestions: [
        {
          category: 'skills',
          originalText: 'React, TypeScript, CSS',
          suggestedText: 'Java, Spring Boot, Hibernate, React, TypeScript, CSS',
          impact: 'HIGH',
        },
        {
          category: 'summary',
          originalText: 'Full-stack engineer with React experience.',
          suggestedText: 'Java developer with Spring Boot and Hibernate experience plus React.',
          impact: 'HIGH',
        },
      ],
    });

    expect(after.skillMatch).toBe(100);
    expect(after.atsScore).toBeGreaterThanOrEqual(74);
    expect(after.atsScore).toBeLessThanOrEqual(91);
  });

  it('raises score when only applied suggestion text is present', () => {
    const withSuggestion = `${sampleResume}\n\nImproved ownership of React delivery pipelines.`;

    const scored = scoreEditedResume({
      content: withSuggestion,
      baselineAtsScore: 55,
      keywords: baseKeywords,
      skillAnalysis: baseSkills,
      appliedSuggestions: [
        {
          category: 'experience',
          originalText: 'Built React dashboards with TypeScript.',
          suggestedText: 'Improved ownership of React delivery pipelines.',
          impact: 'HIGH',
        },
      ],
    });

    expect(scored.atsScore).toBeGreaterThanOrEqual(58);
  });
});
