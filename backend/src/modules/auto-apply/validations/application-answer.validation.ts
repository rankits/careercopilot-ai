import { z } from 'zod';

export const QuestionKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9_]+$/, 'questionKey must be snake_case (lowercase letters, digits, underscore)');

export const CreateApplicationAnswerSchema = z.object({
  questionKey: QuestionKeySchema,
  answer: z.string().trim().min(1, 'Answer cannot be empty').max(4000),
  autoSubmitAllowed: z.boolean().default(false),
});

export type CreateApplicationAnswerInput = z.infer<typeof CreateApplicationAnswerSchema>;

export const UpdateApplicationAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(4000).optional(),
  autoSubmitAllowed: z.boolean().optional(),
});

export type UpdateApplicationAnswerInput = z.infer<typeof UpdateApplicationAnswerSchema>;
