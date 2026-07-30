import { z } from "zod";
import { ProviderTier } from "@/modules/jobs/types/job.types.js";

export const triggerJobsSchema = z.object({
  body: z.object({
    providers: z.array(z.string().min(1)).optional(),
    allowedTiers: z.array(z.nativeEnum(ProviderTier)).optional(),
    concurrency: z.number().int().positive().max(25).optional(),
    dryRun: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});


