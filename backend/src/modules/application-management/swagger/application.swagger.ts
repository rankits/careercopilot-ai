import {
  createApiEndpoint,
  createApiPost,
  createApiDelete,
  successSchema,
  errorSchema,
} from '@/shared/swagger/factory.js';
import { paginatedSchema, commonSecureResponses } from '@/shared/swagger/schemas.js';

const BASE_URL = '/api/v1/applications';
const TAGS = ['Applications'];

const applicationStatusEnum = [
  'SAVED',
  'PREPARING',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'ASSESSMENT',
  'OFFER',
  'ACCEPTED',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
  'GHOSTED',
  'EXPIRED',
];

const applicationSourceTypeEnum = [
  'MANUAL',
  'PLATFORM_JOB',
  'PLATFORM_APPLY',
  'EXTERNAL_JOB_URL',
  'EMAIL_IMPORT',
  'ATS_IMPORT',
  'BROWSER_EXTENSION',
  'CSV_IMPORT',
  'EXTERNAL_API',
  'AI_ASSISTED',
];

const applicationPriorityEnum = ['LOW', 'MEDIUM', 'HIGH'];

const salaryPeriodEnum = ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'];

const noteTypeEnum = ['GENERAL', 'INTERVIEW', 'RECRUITER', 'PREPARATION', 'OFFER', 'REJECTION'];

const taskTypeEnum = [
  'FOLLOW_UP',
  'PREPARE_INTERVIEW',
  'COMPLETE_ASSESSMENT',
  'SEND_DOCUMENT',
  'RESEARCH_COMPANY',
  'NEGOTIATE_OFFER',
  'OTHER',
];

const taskStatusEnum = ['PENDING', 'COMPLETED', 'CANCELLED'];

const statusChangedByEnum = ['USER', 'SYSTEM', 'IMPORT', 'AI'];

const idParam = {
  name: 'id',
  in: 'path' as const,
  required: true as const,
  description: 'Application UUID',
  schema: { type: 'string', format: 'uuid', example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' },
};

const noteIdParam = {
  name: 'noteId',
  in: 'path' as const,
  required: true as const,
  description: 'Note UUID',
  schema: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
};

const taskIdParam = {
  name: 'taskId',
  in: 'path' as const,
  required: true as const,
  description: 'Task UUID',
  schema: { type: 'string', format: 'uuid', example: 'f1e2d3c4-b5a6-7f8e-9d0c-1a2b3c4d5e6f' },
};

const applicationDtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' },
    userId: { type: 'string', format: 'uuid', example: '3f6b1e2a-4b8e-4d2a-9c3a-2e6f1a2b3c4d' },
    jobId: { type: 'string', format: 'uuid', nullable: true, example: null },
    companyId: { type: 'string', format: 'uuid', nullable: true, example: null },
    jobTitle: { type: 'string', example: 'Senior Full Stack Engineer' },
    companyName: { type: 'string', example: 'Acme Corp' },
    companyLogoUrl: { type: 'string', nullable: true, example: 'https://example.com/logo.png' },
    originalJobUrl: { type: 'string', nullable: true, example: 'https://acme.com/jobs/123' },
    location: { type: 'string', nullable: true, example: 'San Francisco, CA' },
    remoteType: { type: 'string', nullable: true, example: 'HYBRID' },
    employmentType: { type: 'string', nullable: true, example: 'FULL_TIME' },
    salaryMin: { type: 'string', nullable: true, example: '150000.0000' },
    salaryMax: { type: 'string', nullable: true, example: '180000.0000' },
    salaryCurrency: { type: 'string', nullable: true, example: 'USD' },
    salaryPeriod: {
      type: 'string',
      nullable: true,
      enum: salaryPeriodEnum,
      example: 'YEAR',
    },
    currentStatus: {
      type: 'string',
      enum: applicationStatusEnum,
      example: 'APPLIED',
    },
    primarySourceType: {
      type: 'string',
      enum: applicationSourceTypeEnum,
      example: 'MANUAL',
    },
    priority: {
      type: 'string',
      enum: applicationPriorityEnum,
      example: 'HIGH',
    },
    interestLevel: { type: 'integer', nullable: true, example: 5 },
    appliedAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-07-01T10:00:00.000Z',
    },
    firstResponseAt: { type: 'string', format: 'date-time', nullable: true, example: null },
    closedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
    createdAt: { type: 'string', format: 'date-time', example: '2026-07-01T09:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-07-01T10:00:00.000Z' },
    archivedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
  },
};

const applicationStatusHistoryDtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '8f7e6d5c-4b3a-2f1e-0d9c-8b7a6f5e4d3c' },
    applicationId: {
      type: 'string',
      format: 'uuid',
      example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
    },
    fromStatus: { type: 'string', enum: applicationStatusEnum, nullable: true, example: 'SAVED' },
    toStatus: { type: 'string', enum: applicationStatusEnum, example: 'APPLIED' },
    changedAt: { type: 'string', format: 'date-time', example: '2026-07-01T10:00:00.000Z' },
    changedBy: { type: 'string', enum: statusChangedByEnum, example: 'USER' },
    note: { type: 'string', nullable: true, example: 'Applied via company portal' },
  },
};

const applicationNoteDtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
    applicationId: {
      type: 'string',
      format: 'uuid',
      example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
    },
    type: { type: 'string', enum: noteTypeEnum, example: 'GENERAL' },
    content: { type: 'string', example: 'Had initial phone screen with recruiter.' },
    createdAt: { type: 'string', format: 'date-time', example: '2026-07-01T11:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-07-01T11:00:00.000Z' },
  },
};

const applicationTaskDtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: 'f1e2d3c4-b5a6-7f8e-9d0c-1a2b3c4d5e6f' },
    applicationId: {
      type: 'string',
      format: 'uuid',
      example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
    },
    title: { type: 'string', example: 'Send thank you note' },
    description: {
      type: 'string',
      nullable: true,
      example: 'Email thank you note to interviewer.',
    },
    type: { type: 'string', enum: taskTypeEnum, example: 'FOLLOW_UP' },
    dueAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-07-05T17:00:00.000Z',
    },
    completedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
    status: { type: 'string', enum: taskStatusEnum, example: 'PENDING' },
    createdAt: { type: 'string', format: 'date-time', example: '2026-07-01T12:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-07-01T12:00:00.000Z' },
  },
};

const applicationDetailDtoSchema = {
  type: 'object',
  properties: {
    ...applicationDtoSchema.properties,
    descriptionSnapshot: {
      type: 'string',
      nullable: true,
      example: 'Full Stack Engineer role working with React and Node.js...',
    },
    skillsSnapshot: {
      type: 'array',
      items: { type: 'string' },
      example: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    },
    statusHistory: {
      type: 'array',
      items: applicationStatusHistoryDtoSchema,
    },
    notes: {
      type: 'array',
      items: applicationNoteDtoSchema,
    },
    tasks: {
      type: 'array',
      items: applicationTaskDtoSchema,
    },
  },
};

export const applicationSwagger = {
  ...createApiEndpoint(
    `${BASE_URL}`,
    {
      post: {
        config: {
          summary: 'Create a new application',
          description:
            'Creates a new job application tracked by the current user. Supports manual entry, platform job linkage, or external job URL.',
          body: {
            required: ['sourceType', 'jobTitle', 'companyName'],
            properties: {
              sourceType: {
                type: 'string',
                enum: applicationSourceTypeEnum,
                example: 'MANUAL',
              },
              jobTitle: { type: 'string', example: 'Senior Full Stack Engineer' },
              companyName: { type: 'string', example: 'Acme Corp' },
              jobId: {
                type: 'string',
                format: 'uuid',
                example: '3f6b1e2a-4b8e-4d2a-9c3a-2e6f1a2b3c4d',
              },
              originalJobUrl: {
                type: 'string',
                format: 'uri',
                example: 'https://acme.com/jobs/123',
              },
              location: { type: 'string', example: 'San Francisco, CA' },
              currentStatus: {
                type: 'string',
                enum: applicationStatusEnum,
                example: 'SAVED',
              },
              priority: {
                type: 'string',
                enum: applicationPriorityEnum,
                example: 'MEDIUM',
              },
              salaryMin: { type: 'number', example: 150000 },
              salaryMax: { type: 'number', example: 180000 },
              salaryCurrency: { type: 'string', example: 'USD' },
              salaryPeriod: {
                type: 'string',
                enum: salaryPeriodEnum,
                example: 'YEAR',
              },
            },
          },
          responses: {
            201: {
              description: 'Application created successfully',
              schema: successSchema('Application created successfully', applicationDtoSchema),
            },
            400: {
              description: 'Validation error',
              schema: errorSchema('Payload is incorrect or missing required fields'),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
      get: {
        config: {
          summary: 'Get list of applications',
          description:
            'Retrieves a paginated and filtered list of applications for the current user.',
          queryParams: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
              description: 'Page number',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20 },
              description: 'Items per page',
            },
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string' },
              description: 'Search term for company name or job title',
            },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string' },
              description: 'Comma-separated application status filter',
            },
            {
              name: 'archived',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['true', 'false', 'all'],
                default: 'false',
              },
              description: 'Filter by archive state',
            },
            {
              name: 'sortBy',
              in: 'query',
              schema: {
                type: 'string',
                enum: [
                  'updatedAt:desc',
                  'updatedAt:asc',
                  'createdAt:desc',
                  'createdAt:asc',
                  'companyName:asc',
                ],
                default: 'updatedAt:desc',
              },
              description: 'Sort criteria',
            },
          ],
          responses: {
            200: {
              description: 'Applications fetched successfully',
              schema: successSchema(
                'Applications fetched successfully',
                paginatedSchema(applicationDtoSchema),
              ),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
    },
    TAGS,
  ),

  ...createApiEndpoint(
    `${BASE_URL}/{id}`,
    {
      get: {
        config: {
          summary: 'Get application details by ID',
          description:
            'Retrieves full details of a single application including description/skills snapshots, status history, notes, and tasks.',
          params: [idParam],
          responses: {
            200: {
              description: 'Application fetched successfully',
              schema: successSchema('Application fetched successfully', applicationDetailDtoSchema),
            },
            404: {
              description: 'Application not found',
              schema: errorSchema('Application not found', 'NOT_FOUND'),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
      patch: {
        config: {
          summary: 'Update application details',
          description: 'Updates core fields of an existing application.',
          params: [idParam],
          body: {
            properties: {
              jobTitle: { type: 'string', example: 'Lead Full Stack Engineer' },
              companyName: { type: 'string', example: 'Acme Corp' },
              location: { type: 'string', nullable: true, example: 'Remote' },
              remoteType: { type: 'string', nullable: true, example: 'REMOTE' },
              employmentType: { type: 'string', nullable: true, example: 'FULL_TIME' },
              priority: { type: 'string', enum: applicationPriorityEnum, example: 'HIGH' },
              interestLevel: { type: 'integer', nullable: true, example: 5 },
              salaryMin: { type: 'number', nullable: true, example: 160000 },
              salaryMax: { type: 'number', nullable: true, example: 190000 },
              salaryCurrency: { type: 'string', nullable: true, example: 'USD' },
              salaryPeriod: {
                type: 'string',
                enum: salaryPeriodEnum,
                nullable: true,
                example: 'YEAR',
              },
            },
          },
          responses: {
            200: {
              description: 'Application updated successfully',
              schema: successSchema('Application updated successfully', applicationDtoSchema),
            },
            400: {
              description: 'Validation error',
              schema: errorSchema('Payload is incorrect or invalid'),
            },
            404: {
              description: 'Application not found',
              schema: errorSchema('Application not found', 'NOT_FOUND'),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
      delete: {
        config: {
          summary: 'Delete an application',
          description:
            'Permanently deletes an application along with its associated notes, tasks, and status history.',
          params: [idParam],
          responses: {
            200: {
              description: 'Application deleted successfully',
              schema: successSchema('Application deleted successfully'),
            },
            404: {
              description: 'Application not found',
              schema: errorSchema('Application not found', 'NOT_FOUND'),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
    },
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/{id}/status-transitions`,
    {
      summary: 'Transition application status',
      description:
        'Transitions an application to a new lifecycle status and records a status history entry.',
      params: [idParam],
      body: {
        required: ['toStatus'],
        properties: {
          toStatus: {
            type: 'string',
            enum: applicationStatusEnum,
            example: 'INTERVIEW',
          },
          note: {
            type: 'string',
            nullable: true,
            example: 'Scheduled phone interview for next Tuesday',
          },
        },
      },
      responses: {
        200: {
          description: 'Application status transitioned successfully',
          schema: successSchema(
            'Application status transitioned successfully',
            applicationDtoSchema,
          ),
        },
        400: {
          description: 'Invalid status transition',
          schema: errorSchema('Invalid status transition'),
        },
        404: {
          description: 'Application not found',
          schema: errorSchema('Application not found', 'NOT_FOUND'),
        },
        ...commonSecureResponses,
      },
    },
    true,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/{id}/archive`,
    {
      summary: 'Archive an application',
      description: 'Marks an application as archived.',
      params: [idParam],
      responses: {
        200: {
          description: 'Application archived successfully',
          schema: successSchema('Application archived successfully', applicationDtoSchema),
        },
        404: {
          description: 'Application not found',
          schema: errorSchema('Application not found', 'NOT_FOUND'),
        },
        ...commonSecureResponses,
      },
    },
    true,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/{id}/unarchive`,
    {
      summary: 'Unarchive an application',
      description: 'Restores an archived application to active tracking.',
      params: [idParam],
      responses: {
        200: {
          description: 'Application unarchived successfully',
          schema: successSchema('Application unarchived successfully', applicationDtoSchema),
        },
        404: {
          description: 'Application not found',
          schema: errorSchema('Application not found', 'NOT_FOUND'),
        },
        ...commonSecureResponses,
      },
    },
    true,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/{id}/notes`,
    {
      summary: 'Add a note to an application',
      description: 'Creates a new note associated with an application.',
      params: [idParam],
      body: {
        required: ['content'],
        properties: {
          type: {
            type: 'string',
            enum: noteTypeEnum,
            default: 'GENERAL',
            example: 'INTERVIEW',
          },
          content: {
            type: 'string',
            example: 'Had a great conversation with the hiring manager.',
          },
        },
      },
      responses: {
        201: {
          description: 'Note added successfully',
          schema: successSchema('Note added successfully', applicationNoteDtoSchema),
        },
        400: {
          description: 'Validation error',
          schema: errorSchema('Note content cannot be empty'),
        },
        404: {
          description: 'Application not found',
          schema: errorSchema('Application not found', 'NOT_FOUND'),
        },
        ...commonSecureResponses,
      },
    },
    true,
    TAGS,
  ),

  ...createApiDelete(
    `${BASE_URL}/{id}/notes/{noteId}`,
    {
      summary: 'Delete a note from an application',
      description: 'Permanently deletes a specific note belonging to an application.',
      params: [idParam, noteIdParam],
      responses: {
        200: {
          description: 'Note deleted successfully',
          schema: successSchema('Note deleted successfully'),
        },
        404: {
          description: 'Note or Application not found',
          schema: errorSchema('Note not found', 'NOT_FOUND'),
        },
        ...commonSecureResponses,
      },
    },
    true,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/{id}/tasks`,
    {
      summary: 'Add a task to an application',
      description: 'Creates a new task associated with an application.',
      params: [idParam],
      body: {
        required: ['title'],
        properties: {
          title: {
            type: 'string',
            example: 'Send follow-up email',
          },
          description: {
            type: 'string',
            nullable: true,
            example: 'Check in on status after technical interview.',
          },
          type: {
            type: 'string',
            enum: taskTypeEnum,
            default: 'FOLLOW_UP',
            example: 'FOLLOW_UP',
          },
          dueAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: '2026-07-05T17:00:00.000Z',
          },
        },
      },
      responses: {
        201: {
          description: 'Task added successfully',
          schema: successSchema('Task added successfully', applicationTaskDtoSchema),
        },
        400: {
          description: 'Validation error',
          schema: errorSchema('Task title is required'),
        },
        404: {
          description: 'Application not found',
          schema: errorSchema('Application not found', 'NOT_FOUND'),
        },
        ...commonSecureResponses,
      },
    },
    true,
    TAGS,
  ),

  ...createApiEndpoint(
    `${BASE_URL}/{id}/tasks/{taskId}`,
    {
      patch: {
        config: {
          summary: 'Update a task',
          description: 'Updates task details or status.',
          params: [idParam, taskIdParam],
          body: {
            properties: {
              title: { type: 'string', example: 'Send follow-up email to recruiter' },
              description: { type: 'string', nullable: true, example: 'Updated task notes.' },
              type: { type: 'string', enum: taskTypeEnum, example: 'FOLLOW_UP' },
              status: { type: 'string', enum: taskStatusEnum, example: 'COMPLETED' },
              dueAt: { type: 'string', format: 'date-time', nullable: true },
              completedAt: { type: 'string', format: 'date-time', nullable: true },
            },
          },
          responses: {
            200: {
              description: 'Task updated successfully',
              schema: successSchema('Task updated successfully', applicationTaskDtoSchema),
            },
            400: {
              description: 'Validation error',
              schema: errorSchema('Invalid task payload'),
            },
            404: {
              description: 'Task or Application not found',
              schema: errorSchema('Task not found', 'NOT_FOUND'),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
      delete: {
        config: {
          summary: 'Delete a task from an application',
          description: 'Permanently deletes a specific task belonging to an application.',
          params: [idParam, taskIdParam],
          responses: {
            200: {
              description: 'Task deleted successfully',
              schema: successSchema('Task deleted successfully'),
            },
            404: {
              description: 'Task or Application not found',
              schema: errorSchema('Task not found', 'NOT_FOUND'),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
    },
    TAGS,
  ),
};
