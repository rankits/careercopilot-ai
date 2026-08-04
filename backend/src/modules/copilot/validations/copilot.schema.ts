import { z } from 'zod';

const emptyQuery = z.object({}).optional();
const emptyParams = z.object({}).optional();

const copilotApplicationSchema = z.object({
  company: z.string().trim().max(200).optional(),
  status: z.string().trim().max(80).optional(),
  title: z.string().trim().max(200).optional(),
});

const copilotJobContextSchema = z.object({
  benefits: z.array(z.string()).max(40).optional(),
  company: z.string().trim().max(200).optional(),
  description: z.string().trim().max(20000).optional(),
  employmentType: z.string().trim().max(80).optional(),
  id: z.string().trim().uuid().optional(),
  location: z.string().trim().max(200).optional(),
  skills: z.array(z.string().trim().max(80)).max(50).optional(),
  title: z.string().trim().max(200).optional(),
});

export const copilotChatBodySchema = z.object({
  context: z
    .object({
      applications: z.array(copilotApplicationSchema).max(50).optional(),
      extra: z.record(z.unknown()).optional(),
      job: copilotJobContextSchema.optional(),
      jobId: z.string().trim().uuid().optional(),
      profile: z.record(z.unknown()).optional(),
      resume: z.record(z.unknown()).optional(),
    })
    .optional()
    .default({}),
  message: z.string().trim().min(1, 'Message is required').max(4000),
  page: z.string().trim().min(1).max(200),
});

export const copilotChatSchema = z.object({
  body: copilotChatBodySchema,
  query: emptyQuery,
  params: emptyParams,
});

export type CopilotChatInput = z.infer<typeof copilotChatBodySchema>;
