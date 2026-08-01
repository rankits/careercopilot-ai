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

export const candidateProfileParamsSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
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

const recordSchema = z.record(z.string(), z.unknown());
const recordArraySchema = z.array(recordSchema);

export const updateCandidateProfileSchema = z.object({
  body: z
    .object({
      personalDetails: recordSchema.optional(),
      experience: recordArraySchema.optional(),
      education: recordArraySchema.optional(),
      skills: z.array(z.string().trim().min(1)).max(200).optional(),
      certifications: recordArraySchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
});
