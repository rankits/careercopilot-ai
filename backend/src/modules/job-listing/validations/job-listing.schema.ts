import { z } from 'zod';

const stringOrStringArray = z.union([z.string(), z.array(z.string())]);

export const jobSearchQuerySchema = z.object({
  query: z.object({
    query: z.string().trim().min(1).max(150).optional(),
    companySlug: z.string().trim().max(120).optional(),
    location: z.string().trim().max(150).optional(),
    remoteTypes: stringOrStringArray.optional(),
    employmentTypes: stringOrStringArray.optional(),
    skills: stringOrStringArray.optional(),
    minSalary: z.coerce.number().nonnegative().optional(),
    maxSalary: z.coerce.number().nonnegative().optional(),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase())
      .optional(),
    sortBy: z.enum(['newest', 'salaryHighToLow', 'salaryLowToHigh']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const jobIdParamsSchema = z.object({
  params: z.object({
    jobId: z.string().uuid('Invalid job ID format'),
  }),
});
