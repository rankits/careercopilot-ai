import { z } from "zod";

export const resumeIdParamsSchema = z.object({
  params: z.object({
    resumeId: z.string().uuid(),
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
