import { z } from 'zod';

export const resumeAnalysisIdParamsSchema = z.object({
  params: z.object({
    resumeId: z.string().uuid(),
  }),
});

export const analyzeResumeSchema = z.object({
  params: z.object({
    resumeId: z.string().uuid(),
  }),
  body: z.object({
    targetRole: z.string().min(1, 'Target role is required'),
    experienceLevel: z
      .enum(['entry', 'mid', 'senior', 'lead', 'executive'])
      .default('mid'),
    jobDescription: z.string().optional(),
  }),
});

export const updateAnalysisStepSchema = z.object({
  params: z.object({
    resumeId: z.string().uuid(),
  }),
  body: z.object({
    step: z.number().int().min(1).max(10),
  }),
});

export const suggestionActionSchema = z.object({
  params: z.object({
    resumeId: z.string().uuid(),
    suggestionId: z.string().regex(/^\d+$/),
  }),
});

export const updateAnalysisContentSchema = z.object({
  params: z.object({
    resumeId: z.string().uuid(),
  }),
  body: z.object({
    content: z.string(),
  }),
});

export const saveResumeVersionSchema = z.object({
  params: z.object({
    resumeId: z.string().uuid(),
  }),
  body: z.object({
    label: z.string().min(1),
    content: z.string().optional(),
  }),
});

export const exportResumeQuerySchema = z.object({
  params: z.object({
    resumeId: z.string().uuid(),
  }),
  query: z.object({
    format: z.enum(['pdf', 'docx', 'txt']).default('txt'),
  }),
});

export const savedVersionIdParamsSchema = z.object({
  params: z.object({
    versionId: z.coerce.number().int().positive(),
  }),
});
