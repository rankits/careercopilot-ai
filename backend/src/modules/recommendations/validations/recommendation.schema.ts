import { z } from 'zod';
import { RECOMMENDATION_FEEDBACK_ACTION_VALUES } from '@/modules/recommendations/types/recommendations.types.js';

const emptyParams = z.object({}).optional();
const emptyQuery = z.object({}).optional();
const uuid = z.string().uuid();
const optionalBooleanQuery = z
  .union([z.boolean(), z.enum(['true', 'false']).transform((value) => value === 'true')])
  .optional();

const defaultProfileRefreshBody = (value: unknown): unknown => {
  if (value === undefined || value === null) return { sourceType: 'PROFILE' };
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
    return { sourceType: 'PROFILE' };
  }
  return value;
};

const stringList = z.array(z.string().trim().min(1)).max(100);

export const recommendationFiltersSchema = z
  .object({
    locations: stringList.optional(),
    workModes: stringList.optional(),
    employmentTypes: stringList.optional(),
    minimumSalary: z.number().nonnegative().optional(),
    maximumSalary: z.number().nonnegative().optional(),
    currency: z.string().trim().length(3).toUpperCase().optional(),
    industries: stringList.optional(),
    experienceLevels: stringList.optional(),
    includeStretchOpportunities: z.boolean().optional(),
  })
  .strict()
  .refine(
    ({ minimumSalary, maximumSalary }) =>
      minimumSalary === undefined || maximumSalary === undefined || minimumSalary <= maximumSalary,
    { message: 'Minimum salary cannot exceed maximum salary' },
  );

export const targetTextBodySchema = z
  .object({
    targetText: z
      .string()
      .trim()
      .min(1, 'TARGET_TEXT_REQUIRED')
      .max(20_000, 'TARGET_TEXT_TOO_LONG'),
    filters: recommendationFiltersSchema.optional(),
  })
  .strict();

const sourceRequestBodySchema = z
  .object({
    sourceType: z.enum(['PROFILE', 'RESUME', 'JOB', 'CAREER_GOAL', 'SAVED_SEARCH']),
    sourceId: uuid.optional(),
    filters: recommendationFiltersSchema.optional(),
  })
  .strict()
  .superRefine(({ sourceType, sourceId }, context) => {
    const requiresId = ['RESUME', 'JOB', 'CAREER_GOAL', 'SAVED_SEARCH'].includes(sourceType);
    if (requiresId && !sourceId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceId'],
        message: `sourceId is required for ${sourceType}`,
      });
    }
    if (sourceType === 'PROFILE' && sourceId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceId'],
        message: 'sourceId is not accepted for PROFILE',
      });
    }
  });

export const createRecommendationSchema = z.object({
  body: sourceRequestBodySchema,
  query: emptyQuery,
  params: emptyParams,
});

export const createRecommendationFromTextSchema = z.object({
  body: targetTextBodySchema,
  query: emptyQuery,
  params: emptyParams,
});

export const refreshRecommendationSchema = z.object({
  body: z.preprocess(defaultProfileRefreshBody, sourceRequestBodySchema),
  query: emptyQuery,
  params: emptyParams,
});

const paginationBaseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const paginationQuerySchema = paginationBaseQuerySchema.extend({
  runId: uuid.optional(),
  latestOnly: optionalBooleanQuery.default(false),
}).refine((query) => !(query.runId && query.latestOnly), {
  message: 'runId and latestOnly cannot be combined',
});

export const listRecommendationsSchema = z.object({
  body: z.object({}).optional(),
  query: paginationQuerySchema,
  params: emptyParams,
});

export const recommendationRunDetailsSchema = z.object({
  body: z.object({}).optional(),
  query: paginationBaseQuerySchema,
  params: z.object({ runId: uuid }),
});

export const recommendationReadinessSchema = z.object({
  body: z.object({}).optional(),
  query: emptyQuery,
  params: emptyParams,
});

export const recommendationIdParamsSchema = z.object({
  body: z.object({}).optional(),
  query: emptyQuery,
  params: z.object({ recommendationId: uuid }),
});

export const recommendationFeedbackSchema = z.object({
  body: z.object({
    action: z.enum(RECOMMENDATION_FEEDBACK_ACTION_VALUES),
    note: z.string().trim().min(1).max(1_000).optional(),
  }),
  query: emptyQuery,
  params: z.object({ recommendationId: uuid }),
});

export const similarJobParamsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) }),
  params: z.object({ jobId: uuid }),
});

export type CreateRecommendationInput = z.infer<typeof sourceRequestBodySchema>;
export type CreateRecommendationFromTextInput = z.infer<typeof targetTextBodySchema>;
export type RecommendationFiltersDto = z.infer<typeof recommendationFiltersSchema>;
export type ListRecommendationsQuery = z.infer<typeof paginationQuerySchema>;
export type RecommendationFeedbackInput = z.infer<typeof recommendationFeedbackSchema>['body'];
export type SimilarJobParams = z.infer<typeof similarJobParamsSchema>['params'];
