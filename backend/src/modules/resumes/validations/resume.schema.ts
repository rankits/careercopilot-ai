import { z } from 'zod';

export const resumeIdParamsSchema = z.object({
  params: z.object({
    resumeId: z.string().uuid(),
  }),
});

export const resumeParseActionParamsSchema = z.object({
  params: z.object({
    resumeId: z.string().uuid(),
  }),
});

export const resumeReparseSchema = z.object({
  params: z.object({
    resumeId: z.string().uuid(),
  }),
  body: z.object({
    reason: z.string().min(1).max(500).optional(),
  }),
});

export const confirmProfileSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
  body: z.object({
    resumeId: z.string().uuid(),
  }),
});
