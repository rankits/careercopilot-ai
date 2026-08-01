import { z } from 'zod';
import {
  ApplicationStatus,
  ApplicationPriority,
  SalaryPeriod,
  NoteType,
  TaskType,
  TaskStatus,
} from '@prisma/client';

export const SafeExternalUrlSchema = z
  .string()
  .url()
  .max(2048)
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Only HTTP and HTTPS URLs are allowed' }
  );

const ManualApplicationSchema = z.object({
  sourceType: z.literal('MANUAL'),
  jobTitle: z.string().trim().min(1, 'Job title is required').max(160),
  companyName: z.string().trim().min(1, 'Company name is required').max(160),
  location: z.string().trim().max(128).optional(),
  originalJobUrl: SafeExternalUrlSchema.optional(),
  currentStatus: z.nativeEnum(ApplicationStatus).default(ApplicationStatus.SAVED),
  priority: z.nativeEnum(ApplicationPriority).default(ApplicationPriority.MEDIUM),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
  salaryCurrency: z.string().trim().length(3).optional(),
  salaryPeriod: z.nativeEnum(SalaryPeriod).default(SalaryPeriod.YEAR),
});

const PlatformJobApplicationSchema = z.object({
  sourceType: z.enum(['PLATFORM_JOB', 'PLATFORM_APPLY']),
  jobId: z.string().uuid('Invalid job ID format'),
  currentStatus: z.nativeEnum(ApplicationStatus).default(ApplicationStatus.SAVED),
  priority: z.nativeEnum(ApplicationPriority).default(ApplicationPriority.MEDIUM),
});

const ExternalUrlApplicationSchema = z.object({
  sourceType: z.literal('EXTERNAL_JOB_URL'),
  originalJobUrl: SafeExternalUrlSchema,
  jobTitle: z.string().trim().min(1, 'Job title is required').max(160),
  companyName: z.string().trim().min(1, 'Company name is required').max(160),
  location: z.string().trim().max(128).optional(),
  currentStatus: z.nativeEnum(ApplicationStatus).default(ApplicationStatus.SAVED),
  priority: z.nativeEnum(ApplicationPriority).default(ApplicationPriority.MEDIUM),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
  salaryCurrency: z.string().trim().length(3).optional(),
  salaryPeriod: z.nativeEnum(SalaryPeriod).default(SalaryPeriod.YEAR),
});

export const CreateApplicationSchema = z.discriminatedUnion('sourceType', [
  ManualApplicationSchema,
  PlatformJobApplicationSchema,
  ExternalUrlApplicationSchema,
]);

export type CreateApplicationInput = z.input<typeof CreateApplicationSchema>;

export const UpdateApplicationSchema = z.object({
  jobTitle: z.string().trim().min(1).max(160).optional(),
  companyName: z.string().trim().min(1).max(160).optional(),
  location: z.string().trim().max(128).nullable().optional(),
  remoteType: z.string().trim().max(32).nullable().optional(),
  employmentType: z.string().trim().max(32).nullable().optional(),
  priority: z.nativeEnum(ApplicationPriority).optional(),
  interestLevel: z.number().int().min(1).max(5).nullable().optional(),
  salaryMin: z.number().positive().nullable().optional(),
  salaryMax: z.number().positive().nullable().optional(),
  salaryCurrency: z.string().trim().length(3).nullable().optional(),
  salaryPeriod: z.nativeEnum(SalaryPeriod).nullable().optional(),
});

export type UpdateApplicationInput = z.infer<typeof UpdateApplicationSchema>;

export const StatusTransitionSchema = z.object({
  toStatus: z.nativeEnum(ApplicationStatus),
  note: z.string().trim().max(2048).optional(),
});

export type StatusTransitionInput = z.infer<typeof StatusTransitionSchema>;

export const CreateNoteSchema = z.object({
  type: z.nativeEnum(NoteType).default(NoteType.GENERAL),
  content: z.string().trim().min(1, 'Note content cannot be empty').max(10000),
});

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;

export const CreateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(200),
  description: z.string().trim().max(5000).optional(),
  type: z.nativeEnum(TaskType).default(TaskType.FOLLOW_UP),
  dueAt: z.string().datetime().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  type: z.nativeEnum(TaskType).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const ApplicationSortBySchema = z.enum([
  'updatedAt:desc',
  'updatedAt:asc',
  'createdAt:desc',
  'createdAt:asc',
  'companyName:asc',
]);

export const ListApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  archived: z.enum(['true', 'false', 'all']).optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  sortBy: ApplicationSortBySchema.default('updatedAt:desc'),
});

export type ListApplicationsQuery = z.infer<typeof ListApplicationsQuerySchema>;
