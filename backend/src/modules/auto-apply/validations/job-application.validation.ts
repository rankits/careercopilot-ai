import { z } from 'zod';

export const InitiateJobApplicationSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
});

export type InitiateJobApplicationInput = z.infer<typeof InitiateJobApplicationSchema>;

export const JobApplicationStatusSchema = z.enum([
  'DISCOVERED',
  'MATCHED',
  'NOT_ELIGIBLE',
  'APPLICATION_PLANNING',
  'INFORMATION_REQUIRED',
  'READY_FOR_REVIEW',
  'READY_FOR_AUTOPILOT',
  'APPROVED',
  'QUEUED',
  'SUBMITTING',
  'SUBMITTED',
  'CONFIRMATION_RECEIVED',
  'SUBMISSION_FAILED',
  'ACTION_REQUIRED',
  'WITHDRAWN',
]);

export const JobApplicationStatusTransitionSchema = z.object({
  toStatus: JobApplicationStatusSchema,
});

export type JobApplicationStatusTransitionInput = z.infer<
  typeof JobApplicationStatusTransitionSchema
>;
