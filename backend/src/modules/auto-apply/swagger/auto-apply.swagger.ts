import { createApiEndpoint, successSchema, errorSchema } from '@/shared/swagger/factory.js';
import { commonSecureResponses } from '@/shared/swagger/schemas.js';

const BASE_URL = '/api/v1/auto-apply';
const TAGS = ['Auto Apply'];

const remotePreferenceEnum = ['REMOTE', 'HYBRID', 'ONSITE', 'ANY'];
const consentTypeEnum = [
  'RESUME_USAGE',
  'CONTENT_GENERATION',
  'EMAIL_SUBMISSION',
  'AUTOPILOT_SUBMISSION',
];
const jobApplicationStatusEnum = [
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
];

const idParam = {
  name: 'id',
  in: 'path' as const,
  required: true as const,
  description: 'Resource UUID',
  schema: { type: 'string', format: 'uuid' },
};

const jobIdParam = {
  name: 'jobId',
  in: 'path' as const,
  required: true as const,
  description: 'Job UUID',
  schema: { type: 'string', format: 'uuid' },
};

const candidateProfileDtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    preferences: {
      type: 'object',
      properties: {
        desiredRoles: { type: 'array', items: { type: 'string' } },
        preferredLocations: { type: 'array', items: { type: 'string' } },
        remotePreference: { type: 'string', enum: remotePreferenceEnum },
        expectedSalary: {
          type: 'object',
          properties: {
            min: { type: 'number' },
            max: { type: 'number' },
            currency: { type: 'string' },
          },
        },
        noticePeriodDays: { type: 'number' },
        willingToRelocate: { type: 'boolean' },
        requiresSponsorship: { type: 'boolean' },
      },
    },
    links: {
      type: 'object',
      properties: {
        linkedin: { type: 'string' },
        github: { type: 'string' },
        portfolio: { type: 'string' },
      },
    },
  },
};

const applicationAnswerDtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    questionKey: { type: 'string', example: 'notice_period_days' },
    answer: { type: 'string' },
    source: { type: 'string', enum: ['USER_VERIFIED'] },
    sensitive: { type: 'boolean' },
    autoSubmitAllowed: { type: 'boolean' },
    lastVerifiedAt: { type: 'string', format: 'date-time' },
  },
};

const resumeVersionDtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    resumeId: { type: 'string', format: 'uuid' },
    label: { type: 'string', example: 'Backend Resume' },
    category: { type: 'string', example: 'Backend' },
    isActive: { type: 'boolean' },
  },
};

const applicationRuleDtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    minMatchScore: { type: 'number', example: 0.85 },
    dailyApplicationLimit: { type: 'number', example: 5 },
    weeklyApplicationLimit: { type: 'number', nullable: true },
    blacklistedCompanySlugs: { type: 'array', items: { type: 'string' } },
    excludedTitleKeywords: { type: 'array', items: { type: 'string' } },
    excludedSources: { type: 'array', items: { type: 'string' } },
    autopilotEnabled: { type: 'boolean' },
    autopilotPausedAt: { type: 'string', format: 'date-time', nullable: true },
  },
};

const eligibilityResultSchema = {
  type: 'object',
  properties: {
    eligible: { type: 'boolean' },
    checks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          check: { type: 'string' },
          status: { type: 'string', enum: ['PASSED', 'FAILED', 'NOT_EVALUATED'] },
          reason: { type: 'string' },
        },
      },
    },
  },
};

const applicationConsentDtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    consentType: { type: 'string', enum: consentTypeEnum },
    version: { type: 'number' },
    grantedAt: { type: 'string', format: 'date-time' },
    revokedAt: { type: 'string', format: 'date-time', nullable: true },
  },
};

const jobApplicationDtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    jobId: { type: 'string', format: 'uuid', nullable: true },
    channel: {
      type: 'string',
      enum: ['EMAIL', 'EXTERNAL_MANUAL', 'ATS_API', 'BROWSER_ASSISTED', 'UNSUPPORTED'],
    },
    status: { type: 'string', enum: jobApplicationStatusEnum },
    matchScore: { type: 'number', nullable: true },
    eligibilityResult: { ...eligibilityResultSchema, nullable: true },
    planVersion: { type: 'number' },
  },
};

export const autoApplySwagger = {
  ...createApiEndpoint(
    `${BASE_URL}/profile`,
    {
      get: {
        config: {
          summary: "Get the caller's candidate application profile",
          responses: {
            200: {
              description: 'Profile fetched',
              schema: successSchema('OK', candidateProfileDtoSchema),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
      put: {
        config: {
          summary: "Create or update the caller's candidate application profile",
          body: { properties: { preferences: { type: 'object' }, links: { type: 'object' } } },
          responses: {
            200: {
              description: 'Profile saved',
              schema: successSchema('OK', candidateProfileDtoSchema),
            },
            400: { description: 'Validation error', schema: errorSchema('Invalid payload') },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
    },
    TAGS,
  ),

  ...createApiEndpoint(
    `${BASE_URL}/answers`,
    {
      get: {
        config: {
          summary: "List the caller's verified application answers",
          responses: {
            200: {
              description: 'Answers fetched',
              schema: successSchema('OK', { type: 'array', items: applicationAnswerDtoSchema }),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
      post: {
        config: {
          summary: 'Save a verified application answer',
          description:
            'Demographic/disability/veteran-status question keys are rejected with 403 SENSITIVE_ANSWER_PROHIBITED — those answers are never stored, per platform policy.',
          body: {
            required: ['questionKey', 'answer'],
            properties: {
              questionKey: { type: 'string', example: 'notice_period_days' },
              answer: { type: 'string' },
              autoSubmitAllowed: { type: 'boolean' },
            },
          },
          responses: {
            201: {
              description: 'Answer saved',
              schema: successSchema('OK', applicationAnswerDtoSchema),
            },
            403: {
              description: 'Prohibited question key',
              schema: errorSchema('Sensitive answer prohibited', 'SENSITIVE_ANSWER_PROHIBITED'),
            },
            409: {
              description: 'Answer already exists for this question',
              schema: errorSchema('Answer exists', 'ANSWER_EXISTS'),
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
    `${BASE_URL}/answers/{id}`,
    {
      patch: {
        config: {
          summary: 'Update a verified application answer',
          params: [idParam],
          body: {
            properties: { answer: { type: 'string' }, autoSubmitAllowed: { type: 'boolean' } },
          },
          responses: {
            200: {
              description: 'Answer updated',
              schema: successSchema('OK', applicationAnswerDtoSchema),
            },
            404: {
              description: 'Answer not found',
              schema: errorSchema('Not found', 'ANSWER_NOT_FOUND'),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
      delete: {
        config: {
          summary: 'Delete a verified application answer',
          params: [idParam],
          responses: {
            200: { description: 'Answer deleted', schema: successSchema('OK') },
            404: {
              description: 'Answer not found',
              schema: errorSchema('Not found', 'ANSWER_NOT_FOUND'),
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
    `${BASE_URL}/resume-versions`,
    {
      get: {
        config: {
          summary: "List the caller's approved resume versions",
          responses: {
            200: {
              description: 'Versions fetched',
              schema: successSchema('OK', { type: 'array', items: resumeVersionDtoSchema }),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
      post: {
        config: {
          summary: 'Approve a resume version for a job category',
          body: {
            required: ['resumeId', 'label', 'category'],
            properties: {
              resumeId: { type: 'string', format: 'uuid' },
              label: { type: 'string', example: 'Backend Resume' },
              category: { type: 'string', example: 'Backend' },
              isActive: { type: 'boolean' },
            },
          },
          responses: {
            201: {
              description: 'Version created',
              schema: successSchema('OK', resumeVersionDtoSchema),
            },
            404: {
              description: 'Resume not found',
              schema: errorSchema('Not found', 'RESUME_NOT_FOUND'),
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
    `${BASE_URL}/resume-versions/{id}`,
    {
      patch: {
        config: {
          summary: 'Update an approved resume version',
          params: [idParam],
          body: {
            properties: {
              label: { type: 'string' },
              category: { type: 'string' },
              isActive: { type: 'boolean' },
            },
          },
          responses: {
            200: {
              description: 'Version updated',
              schema: successSchema('OK', resumeVersionDtoSchema),
            },
            404: {
              description: 'Not found',
              schema: errorSchema('Not found', 'RESUME_VERSION_NOT_FOUND'),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
      delete: {
        config: {
          summary: 'Delete an approved resume version',
          params: [idParam],
          responses: {
            200: { description: 'Version deleted', schema: successSchema('OK') },
            404: {
              description: 'Not found',
              schema: errorSchema('Not found', 'RESUME_VERSION_NOT_FOUND'),
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
    `${BASE_URL}/rules`,
    {
      get: {
        config: {
          summary: "Get the caller's autopilot/eligibility rule configuration",
          responses: {
            200: {
              description: 'Rule config fetched',
              schema: successSchema('OK', applicationRuleDtoSchema),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
      put: {
        config: {
          summary: 'Update autopilot/eligibility rule configuration',
          description:
            "Does not expose autopilotEnabled — enabling full autopilot has no safe effect until Wave 6's enforcement lands.",
          body: {
            properties: {
              minMatchScore: { type: 'number' },
              dailyApplicationLimit: { type: 'number' },
              weeklyApplicationLimit: { type: 'number', nullable: true },
              blacklistedCompanySlugs: { type: 'array', items: { type: 'string' } },
              excludedTitleKeywords: { type: 'array', items: { type: 'string' } },
              excludedSources: { type: 'array', items: { type: 'string' } },
            },
          },
          responses: {
            200: {
              description: 'Rule config saved',
              schema: successSchema('OK', applicationRuleDtoSchema),
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
    `${BASE_URL}/rules/pause`,
    {
      post: {
        config: {
          summary: 'Pause autopilot immediately',
          responses: {
            200: {
              description: 'Autopilot paused',
              schema: successSchema('OK', applicationRuleDtoSchema),
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
    `${BASE_URL}/rules/resume`,
    {
      post: {
        config: {
          summary: 'Resume autopilot',
          responses: {
            200: {
              description: 'Autopilot resumed',
              schema: successSchema('OK', applicationRuleDtoSchema),
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
    `${BASE_URL}/eligibility/{jobId}`,
    {
      get: {
        config: {
          summary: 'Run the hard eligibility engine for a job against the caller profile and rules',
          description:
            'Independent of recommendation match scoring — a high-match job can still come back NOT_ELIGIBLE. Candidate-side fail-closed checks for work authorization, sponsorship, and experience live on GET /readiness/{jobId}.',
          params: [jobIdParam],
          responses: {
            200: {
              description: 'Eligibility evaluated',
              schema: successSchema('OK', eligibilityResultSchema),
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
    `${BASE_URL}/readiness/{jobId}`,
    {
      get: {
        config: {
          summary: 'Evaluate the central Application Readiness Gate for a job',
          description:
            'Authoritative safety/eligibility decision used at PLAN, APPROVE, QUEUE, and SUBMIT. Query `stage` (PLAN|APPROVE|QUEUE|SUBMIT) and optional `jobApplicationId`. Returns structured blockingReasons without sensitive answer values.',
          params: [jobIdParam],
          responses: {
            200: {
              description: 'Readiness evaluated',
              schema: successSchema('OK', {
                type: 'object',
                properties: {
                  decision: {
                    type: 'string',
                    enum: [
                      'READY',
                      'INFORMATION_REQUIRED',
                      'NOT_ELIGIBLE',
                      'LIMIT_REACHED',
                      'DUPLICATE',
                      'CONSENT_REQUIRED',
                      'CHANNEL_UNSUPPORTED',
                      'JOB_UNAVAILABLE',
                      'FEATURE_DISABLED',
                    ],
                  },
                  ready: { type: 'boolean' },
                  blockingReasons: { type: 'array', items: { type: 'object' } },
                  warnings: { type: 'array', items: { type: 'object' } },
                  evaluatedRules: { type: 'object' },
                  evaluatedAt: { type: 'string', format: 'date-time' },
                },
              }),
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
    `${BASE_URL}/consents`,
    {
      get: {
        config: {
          summary: "List the caller's auto-apply consent grants",
          responses: {
            200: {
              description: 'Consents fetched',
              schema: successSchema('OK', { type: 'array', items: applicationConsentDtoSchema }),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
      post: {
        config: {
          summary: 'Grant an auto-apply consent',
          body: {
            required: ['consentType'],
            properties: { consentType: { type: 'string', enum: consentTypeEnum } },
          },
          responses: {
            201: {
              description: 'Consent granted',
              schema: successSchema('OK', applicationConsentDtoSchema),
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
    `${BASE_URL}/consents/{id}`,
    {
      delete: {
        config: {
          summary: 'Revoke an auto-apply consent grant',
          params: [idParam],
          responses: {
            200: {
              description: 'Consent revoked',
              schema: successSchema('OK', applicationConsentDtoSchema),
            },
            404: {
              description: 'Not found',
              schema: errorSchema('Not found', 'CONSENT_NOT_FOUND'),
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
    `${BASE_URL}/submissions`,
    {
      get: {
        config: {
          summary: "List the caller's auto-apply submissions",
          responses: {
            200: {
              description: 'Submissions fetched',
              schema: successSchema('OK', { type: 'array', items: jobApplicationDtoSchema }),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
      post: {
        config: {
          summary: 'Start tracking a job for auto-apply',
          description:
            "Hard-blocks exact (userId, jobId) and canonical-job-id duplicates with 409 APPLICATION_EXISTS. Fuzzy company+title matches among the caller's other submissions are never blocked — they are returned in `possibleDuplicates` as a warning (AJA-PROD-007).",
          body: { required: ['jobId'], properties: { jobId: { type: 'string', format: 'uuid' } } },
          responses: {
            201: {
              description: 'Submission created',
              schema: successSchema('OK', {
                type: 'object',
                properties: {
                  application: jobApplicationDtoSchema,
                  possibleDuplicates: { type: 'array', items: jobApplicationDtoSchema },
                },
              }),
            },
            404: {
              description: 'Job not found',
              schema: errorSchema('Not found', 'JOB_NOT_FOUND'),
            },
            409: {
              description: 'Duplicate submission',
              schema: errorSchema('Already exists', 'APPLICATION_EXISTS'),
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
    `${BASE_URL}/submissions/{id}`,
    {
      get: {
        config: {
          summary: 'Get an auto-apply submission',
          params: [idParam],
          responses: {
            200: {
              description: 'Submission fetched',
              schema: successSchema('OK', jobApplicationDtoSchema),
            },
            404: {
              description: 'Not found',
              schema: errorSchema('Not found', 'APPLICATION_NOT_FOUND'),
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
    `${BASE_URL}/submissions/{id}/evaluate-eligibility`,
    {
      post: {
        config: {
          summary: 'Run the eligibility engine and record MATCHED/NOT_ELIGIBLE on this submission',
          params: [idParam],
          responses: {
            200: {
              description: 'Eligibility evaluated',
              schema: successSchema('OK', jobApplicationDtoSchema),
            },
            409: {
              description: 'Invalid state transition',
              schema: errorSchema('Conflict', 'INVALID_STATUS_TRANSITION'),
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
    `${BASE_URL}/submissions/{id}/status-transitions`,
    {
      post: {
        config: {
          summary: 'Transition a submission to a new status through the validated state machine',
          params: [idParam],
          body: {
            required: ['toStatus'],
            properties: { toStatus: { type: 'string', enum: jobApplicationStatusEnum } },
          },
          responses: {
            200: {
              description: 'Transitioned',
              schema: successSchema('OK', jobApplicationDtoSchema),
            },
            409: {
              description: 'Invalid state transition',
              schema: errorSchema('Conflict', 'INVALID_STATUS_TRANSITION'),
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
    `${BASE_URL}/submissions/{id}/withdraw`,
    {
      post: {
        config: {
          summary: 'Withdraw an auto-apply submission',
          params: [idParam],
          responses: {
            200: { description: 'Withdrawn', schema: successSchema('OK', jobApplicationDtoSchema) },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
    },
    TAGS,
  ),

  ...createApiEndpoint(
    `${BASE_URL}/submissions/{id}/approve`,
    {
      post: {
        config: {
          summary: 'Approve a READY_FOR_REVIEW submission',
          description:
            'Requires an active RESUME_USAGE consent grant — returns 403 CONSENT_REQUIRED otherwise.',
          params: [idParam],
          responses: {
            200: { description: 'Approved', schema: successSchema('OK', jobApplicationDtoSchema) },
            403: {
              description: 'Consent required',
              schema: errorSchema('Consent required', 'CONSENT_REQUIRED'),
            },
            409: {
              description: 'Invalid state transition',
              schema: errorSchema('Conflict', 'INVALID_STATUS_TRANSITION'),
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
    `${BASE_URL}/submissions/{id}/queue`,
    {
      post: {
        config: {
          summary: 'Queue an APPROVED submission for channel submission',
          description:
            'Transitions to QUEUED and publishes to the RabbitMQ submission worker, which locks, revalidates, and submits through the registered channel adapter.',
          params: [idParam],
          responses: {
            200: { description: 'Queued', schema: successSchema('OK', jobApplicationDtoSchema) },
            409: {
              description: 'Invalid state transition',
              schema: errorSchema('Conflict', 'INVALID_STATUS_TRANSITION'),
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
    `${BASE_URL}/submissions/{id}/confirm`,
    {
      post: {
        config: {
          summary: 'Confirm an ACTION_REQUIRED submission was completed by the user',
          description:
            'For EXTERNAL_MANUAL hand-offs — the user applied themselves and confirms it here.',
          params: [idParam],
          responses: {
            200: { description: 'Confirmed', schema: successSchema('OK', jobApplicationDtoSchema) },
            409: {
              description: 'Invalid state transition',
              schema: errorSchema('Conflict', 'INVALID_STATUS_TRANSITION'),
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
    `${BASE_URL}/submissions/{id}/retry`,
    {
      post: {
        config: {
          summary: 'Retry a SUBMISSION_FAILED submission',
          description:
            'Only allowed when the most recent attempt was classified FAILED_SAFE_TO_RETRY — returns 409 RETRY_NOT_ALLOWED for FAILED_DO_NOT_RETRY or an uncertain (SUBMISSION_OUTCOME_UNKNOWN) prior attempt. Never automatic.',
          params: [idParam],
          responses: {
            200: { description: 'Re-queued', schema: successSchema('OK', jobApplicationDtoSchema) },
            409: {
              description: 'Retry not allowed',
              schema: errorSchema('Conflict', 'RETRY_NOT_ALLOWED'),
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
    `${BASE_URL}/vacancy-email/{jobId}`,
    {
      get: {
        config: {
          summary: "Discover a vacancy's published contact email from its job description",
          description:
            'Only extracts addresses the employer explicitly published in the job description text — never guesses a company-domain address. Discovery alone does not enable the EMAIL channel (that also needs AJA-EMAIL-001, not yet built).',
          params: [jobIdParam],
          responses: {
            200: {
              description: 'Discovery completed',
              schema: successSchema('OK', {
                type: 'object',
                properties: {
                  bestCandidate: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      email: { type: 'string' },
                      confidence: { type: 'string', enum: ['HIGH', 'LOW'] },
                      context: { type: 'string' },
                    },
                  },
                  candidates: { type: 'array', items: { type: 'object' } },
                },
              }),
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
