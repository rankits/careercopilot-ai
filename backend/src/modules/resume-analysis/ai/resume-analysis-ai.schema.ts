import { z } from 'zod';

const percentageSchema = z.number().min(0).max(100).transform((value) => Math.round(value));

const keywordSchema = z.object({
  term: z.string().min(1),
  importance: z.enum(['high', 'medium', 'low']).catch('medium'),
});

const suggestionCategorySchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z.enum([
      'summary',
      'experience',
      'skills',
      'education',
      'projects',
      'certifications',
      'achievements',
    ]),
  );

export const resumeAnalysisAiSchema = z.object({
  atsScore: percentageSchema,
  keywordMatch: percentageSchema,
  skillMatch: percentageSchema,
  contentQuality: percentageSchema,
  readability: percentageSchema,
  formattingScore: percentageSchema.catch(0),

  strengths: z.array(z.string()).min(1).catch([]),
  weaknesses: z.array(z.string()).min(1).catch([]),

  missingKeywords: z
    .array(
      keywordSchema.extend({
        reason: z.string().catch(''),
      }),
    )
    .catch([]),

  matchedKeywords: z.array(keywordSchema).catch([]),

  skillAnalysis: z
    .object({
      matchedSkills: z.array(z.string()).catch([]),
      missingSkills: z.array(z.string()).catch([]),
      transferableSkills: z.array(z.string()).catch([]),
      recommendedSkills: z.array(z.string()).catch([]),
    })
    .catch({
      matchedSkills: [],
      missingSkills: [],
      transferableSkills: [],
      recommendedSkills: [],
    }),

  sectionScores: z
    .object({
      summary: percentageSchema.catch(0),
      experience: percentageSchema.catch(0),
      skills: percentageSchema.catch(0),
      education: percentageSchema.catch(0),
      projects: percentageSchema.catch(0),
      achievements: percentageSchema.catch(0),
    })
    .catch({
      summary: 0,
      experience: 0,
      skills: 0,
      education: 0,
      projects: 0,
      achievements: 0,
    }),

  atsIssues: z
    .array(
      z.object({
        issue: z.string(),
        section: z.string(),
        severity: z.enum(['HIGH', 'MEDIUM', 'LOW']).catch('MEDIUM'),
        fix: z.string(),
      }),
    )
    .catch([]),

  suggestions: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string(),
        category: suggestionCategorySchema.catch('summary'),
        originalText: z.string().catch(''),
        suggestedText: z.string(),
        impact: z.enum(['HIGH', 'MEDIUM', 'LOW']).catch('MEDIUM'),
        reason: z.string().catch(''),
      }),
    )
    .min(1)
    .catch([]),

  optimizedSections: z
    .object({
      professionalSummary: z.string().catch(''),
      skills: z.array(z.string()).catch([]),
      experienceBullets: z
        .array(
          z.object({
            originalText: z.string().catch(''),
            optimizedText: z.string(),
          }),
        )
        .catch([]),
      projectBullets: z
        .array(
          z.object({
            originalText: z.string().catch(''),
            optimizedText: z.string(),
          }),
        )
        .catch([]),
    })
    .catch({
      professionalSummary: '',
      skills: [],
      experienceBullets: [],
      projectBullets: [],
    }),

  optimizedResumeText: z.string().catch(''),

  experienceRelevance: percentageSchema.catch(0).optional(),
  resumeStrength: percentageSchema.catch(0).optional(),
  industryAlignment: percentageSchema.catch(0).optional(),
  recruiterReadability: percentageSchema.catch(0).optional(),
  interviewReadiness: percentageSchema.catch(0).optional(),
  missingSkills: z.array(z.string()).catch([]).optional(),
  improvedSummary: z.string().catch('').optional(),
  improvedExperience: z.array(z.string()).catch([]).optional(),
  improvedProjects: z.array(z.string()).catch([]).optional(),
  improvedSkills: z.array(z.string()).catch([]).optional(),
  recommendedSkillOrder: z.array(z.string()).catch([]).optional(),
  atsSuggestions: z.array(z.string()).catch([]).optional(),
  grammarSuggestions: z.array(z.string()).catch([]).optional(),
  finalResume: z.record(z.unknown()).catch({}).optional(),
});

export type ValidatedAiAnalysisOutput = z.infer<typeof resumeAnalysisAiSchema>;
