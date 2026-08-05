import { z } from 'zod';

export const CreateApprovedResumeVersionSchema = z.object({
  resumeId: z.string().uuid('Invalid resume ID format'),
  label: z.string().trim().min(1, 'Label is required').max(120),
  category: z.string().trim().min(1, 'Category is required').max(60),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  isActive: z.boolean().default(true),
});

export type CreateApprovedResumeVersionInput = z.infer<typeof CreateApprovedResumeVersionSchema>;

export const UpdateApprovedResumeVersionSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateApprovedResumeVersionInput = z.infer<typeof UpdateApprovedResumeVersionSchema>;
