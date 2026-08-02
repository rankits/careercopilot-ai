import {
  createApiDelete,
  createApiGet,
  createApiPatch,
  createApiPost,
  errorSchema,
  successSchema,
} from '@/shared/swagger/factory.js';
import { commonSecureResponses, paginatedSchema } from '@/shared/swagger/schemas.js';
import {
  RECOMMENDATION_CATEGORY_VALUES,
  RECOMMENDATION_FEEDBACK_ACTION_VALUES,
  RECOMMENDATION_FILTER_MODE_VALUES,
  RECOMMENDATION_LIFECYCLE_STATE_VALUES,
  RECOMMENDATION_MATCH_TYPE_VALUES,
  RECOMMENDATION_RUN_STATUS_VALUES,
  RECOMMENDATION_SCORE_COMPONENT_VALUES,
  RECOMMENDATION_SOURCE_TYPE_VALUES,
} from '@/modules/recommendations/types/recommendations.types.js';
import type { PathParameter } from '@/shared/types/swagger.types.js';

const BASE_URL = '/api/v1/job-recommendations';
const TAGS = ['Job Recommendations'];

const stringListSchema = {
  type: 'array',
  items: { type: 'string', minLength: 1 },
  maxItems: 100,
};

const filtersSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    locations: stringListSchema,
    workModes: stringListSchema,
    employmentTypes: stringListSchema,
    minimumSalary: { type: 'number', minimum: 0, example: 100000 },
    maximumSalary: { type: 'number', minimum: 0, example: 180000 },
    currency: { type: 'string', minLength: 3, maxLength: 3, example: 'USD' },
    industries: stringListSchema,
    experienceLevels: stringListSchema,
    filterMode: {
      type: 'string',
      enum: [...RECOMMENDATION_FILTER_MODE_VALUES],
      default: 'STRICT',
      description:
        'STRICT enforces salary, location, remote, and employment filters. FLEXIBLE keeps negotiable near-misses and labels them as stretch opportunities.',
    },
    includeStretchOpportunities: { type: 'boolean', example: true },
  },
};

const jobListSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string', example: 'Backend Engineer' },
    company: {
      type: 'object',
      properties: {
        slug: { type: 'string', example: 'acme' },
        name: { type: 'string', example: 'Acme' },
        logoUrl: { type: 'string', nullable: true },
        verified: { type: 'boolean', example: true },
      },
    },
    location: {
      type: 'object',
      properties: {
        formatted: { type: 'string', example: 'Remote' },
        remoteType: { type: 'string', nullable: true, example: 'REMOTE' },
      },
    },
    employmentType: { type: 'string', nullable: true, example: 'FULL_TIME' },
    salary: {
      type: 'object',
      properties: {
        minimum: { type: 'number', nullable: true, example: 120000 },
        maximum: { type: 'number', nullable: true, example: 160000 },
        currency: { type: 'string', nullable: true, example: 'USD' },
      },
    },
    skills: { type: 'array', items: { type: 'string' }, example: ['TypeScript', 'PostgreSQL'] },
    publishedAt: { type: 'string', format: 'date-time', nullable: true },
    expiresAt: { type: 'string', format: 'date-time', nullable: true },
  },
};

const scoreResultSchema = {
  type: 'object',
  properties: {
    overallScore: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      example: 0.82,
      description:
        'Internal unit-interval match score in [0, 1]. Use the top-level displayScore for user-facing percentages. See docs/SCORE_SCALE.md.',
    },
    components: {
      type: 'object',
      properties: Object.fromEntries(
        RECOMMENDATION_SCORE_COMPONENT_VALUES.map((component) => [
          component,
          { type: 'number', minimum: 0, maximum: 1 },
        ]),
      ),
    },
    matchedSkills: { type: 'array', items: { type: 'string' } },
    aliasSkills: { type: 'array', items: { type: 'string' } },
    relatedSkills: { type: 'array', items: { type: 'string' } },
    transferableSkills: { type: 'array', items: { type: 'string' } },
    missingSkills: { type: 'array', items: { type: 'string' } },
    reasons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          component: { type: 'string', enum: [...RECOMMENDATION_SCORE_COMPONENT_VALUES] },
          message: { type: 'string' },
          evidence: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

const skillGapSchema = {
  type: 'object',
  properties: {
    exact: { type: 'array', items: { type: 'string' } },
    alias: { type: 'array', items: { type: 'string' } },
    related: { type: 'array', items: { type: 'string' } },
    transferable: { type: 'array', items: { type: 'string' } },
    missing: { type: 'array', items: { type: 'string' } },
  },
};

const recommendationItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    runId: { type: 'string', format: 'uuid' },
    rank: { type: 'integer', example: 1 },
    job: jobListSchema,
    displayScore: {
      type: 'integer',
      minimum: 0,
      maximum: 100,
      example: 87,
      description:
        'User-facing match score derived from scoreResult.overallScore and rounded to 0-100.',
    },
    explanation: {
      type: 'object',
      properties: {
        summary: { type: 'string', example: '87% match with 3 matched skills' },
        bullets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              component: { type: 'string', enum: [...RECOMMENDATION_SCORE_COMPONENT_VALUES] },
              label: { type: 'string', example: 'Required skills' },
              score: { type: 'number', minimum: 0, maximum: 1 },
              weight: { type: 'number', minimum: 0, maximum: 1 },
              contribution: { type: 'number', minimum: 0, maximum: 1 },
              message: { type: 'string' },
              evidence: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        matchedSkills: { type: 'array', items: { type: 'string' } },
        aliasSkills: { type: 'array', items: { type: 'string' } },
        relatedSkills: { type: 'array', items: { type: 'string' } },
        transferableSkills: { type: 'array', items: { type: 'string' } },
        missingSkills: { type: 'array', items: { type: 'string' } },
        scoreModel: {
          type: 'object',
          properties: {
            overallScore: { type: 'number', minimum: 0, maximum: 1 },
            displayScore: { type: 'integer', minimum: 0, maximum: 100 },
            heuristicWeight: { type: 'number', example: 0.6 },
            retrievalWeight: { type: 'number', example: 0.4 },
            heuristicScore: { type: 'number', minimum: 0, maximum: 1 },
            retrievalScore: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
      },
    },
    skillGap: skillGapSchema,
    scoreResult: scoreResultSchema,
    category: { type: 'string', enum: [...RECOMMENDATION_CATEGORY_VALUES] },
    matchType: { type: 'string', enum: [...RECOMMENDATION_MATCH_TYPE_VALUES] },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const similarJobItemSchema = {
  type: 'object',
  properties: {
    rank: { type: 'integer', example: 1 },
    job: jobListSchema,
    displayScore: {
      type: 'integer',
      minimum: 0,
      maximum: 100,
      example: 87,
      description:
        'User-facing match score derived from scoreResult.overallScore and rounded to 0-100.',
    },
    scoreResult: scoreResultSchema,
    category: { type: 'string', enum: [...RECOMMENDATION_CATEGORY_VALUES] },
    matchType: { type: 'string', enum: [...RECOMMENDATION_MATCH_TYPE_VALUES] },
  },
};

const recommendationArraySchema = {
  type: 'array',
  items: recommendationItemSchema,
};

const readinessStatusSchema = {
  type: 'object',
  required: [
    'ready',
    'lifecycleState',
    'canGenerateFromProfile',
    'blockers',
    'retrieval',
  ],
  properties: {
    ready: {
      type: 'boolean',
      example: true,
      description: 'Backward-compatible readiness boolean for existing clients.',
    },
    lifecycleState: {
      type: 'string',
      enum: [...RECOMMENDATION_LIFECYCLE_STATE_VALUES],
      example: 'READY',
      description:
        'Lifecycle state derived from the latest recommendation run and freshness checks.',
    },
    canGenerateFromProfile: { type: 'boolean', example: true },
    blockers: {
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'PROFILE_INCOMPLETE',
          'PROFILE_NOT_FOUND',
          'PROFILE_UNAVAILABLE',
          'RECOMMENDATIONS_STALE',
          'EMBEDDING_COVERAGE_LOW',
        ],
      },
      example: [],
      description: 'Reasons generation is blocked or why existing results need refresh.',
    },
    stale: {
      type: 'boolean',
      example: false,
      description: 'True when an existing recommendation set is older than profile/job signals.',
    },
    lastGeneratedAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-08-02T00:00:00.000Z',
    },
    retrieval: {
      type: 'object',
      required: ['backend', 'configured'],
      properties: {
        backend: { type: 'string', example: 'PGVECTOR' },
        configured: { type: 'boolean', example: true },
        embeddingCoverageRatio: { type: 'number', minimum: 0, maximum: 1, example: 0.96 },
      },
    },
  },
};

const recommendationRunSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    sourceType: { type: 'string', enum: [...RECOMMENDATION_SOURCE_TYPE_VALUES] },
    sourceId: { type: 'string', format: 'uuid', nullable: true },
    status: { type: 'string', enum: [...RECOMMENDATION_RUN_STATUS_VALUES] },
    lifecycleState: { type: 'string', enum: [...RECOMMENDATION_LIFECYCLE_STATE_VALUES] },
    candidateCount: { type: 'integer', minimum: 0 },
    failureCode: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
  },
};

const recommendationRunPageSchema = {
  type: 'object',
  properties: {
    run: recommendationRunSchema,
    items: { type: 'array', items: recommendationItemSchema },
    page: { type: 'integer', minimum: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
    total: { type: 'integer', minimum: 0 },
  },
};

const savedSearchSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Remote TypeScript platform roles' },
    query: {
      type: 'string',
      nullable: true,
      example: 'Senior backend engineer TypeScript PostgreSQL',
    },
    filters: {
      type: 'object',
      additionalProperties: true,
      example: { locations: ['Remote'], workModes: ['REMOTE'], minimumSalary: 120000 },
    },
    context: {
      type: 'object',
      additionalProperties: true,
      nullable: true,
      example: { titles: ['Platform Engineer'], industries: ['SaaS'] },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const savedSearchPageSchema = {
  type: 'object',
  properties: {
    items: { type: 'array', items: savedSearchSchema },
    page: { type: 'integer', minimum: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
    total: { type: 'integer', minimum: 0 },
  },
};

const careerTargetSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    goalText: {
      type: 'string',
      example: 'Move from manual testing into automation QA roles',
    },
    structured: {
      type: 'object',
      additionalProperties: true,
      example: { targetRole: 'Automation QA Engineer' },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const careerTargetPageSchema = {
  type: 'object',
  properties: {
    items: { type: 'array', items: careerTargetSchema },
    page: { type: 'integer', minimum: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
    total: { type: 'integer', minimum: 0 },
  },
};

const careerTargetIdParam = [
  {
    name: 'careerTargetId',
    in: 'path',
    required: true,
    description: 'Owned career target UUID',
    schema: {
      type: 'string',
      format: 'uuid',
      example: '33333333-3333-3333-3333-333333333333',
    },
  },
] satisfies PathParameter[];

const savedSearchWriteBody = {
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 160 },
    query: { type: 'string', nullable: true, maxLength: 20000 },
    filters: {
      type: 'object',
      additionalProperties: true,
      example: { locations: ['Remote'], workModes: ['REMOTE'] },
    },
    context: {
      type: 'object',
      additionalProperties: true,
      example: { titles: ['Backend Engineer'] },
    },
  },
};

const savedSearchIdParam = [
  {
    name: 'savedSearchId',
    in: 'path',
    required: true,
    description: 'Owned saved search UUID',
    schema: {
      type: 'string',
      format: 'uuid',
      example: '44444444-4444-4444-4444-444444444444',
    },
  },
] satisfies PathParameter[];

const commonRecommendationErrors = {
  ...commonSecureResponses,
  403: {
    description: 'Caller is not a USER principal or lacks recommendation permissions',
    schema: errorSchema('Job recommendations are available only to user accounts'),
  },
  404: {
    description: 'No eligible jobs found, or source job/profile/resume missing',
    schema: errorSchema('No eligible jobs were found for this recommendation context'),
  },
  501: {
    description: 'Dependency not configured',
    schema: errorSchema(
      'Recommendation repositories, retrieval, and scoring dependencies are not configured',
      'JOB_RECOMMENDATIONS_NOT_IMPLEMENTED',
    ),
  },
};

const mergeSwaggerDocs = (
  ...documents: Array<Record<string, Record<string, unknown>>>
): Record<string, Record<string, unknown>> =>
  documents.reduce(
    (merged, document) => {
      for (const [path, methods] of Object.entries(document)) {
        merged[path] = { ...(merged[path] ?? {}), ...methods };
      }
      return merged;
    },
    {} as Record<string, Record<string, unknown>>,
  );

export const recommendationsSwagger = mergeSwaggerDocs(
  createApiPost(
    BASE_URL,
    {
      summary: 'Generate recommendations from an authorized source',
      description:
        'Supports PROFILE, RESUME, JOB, CAREER_GOAL, and SAVED_SEARCH. Uses PGVECTOR retrieval and hybrid scoring; results are persisted durably.',
      body: {
        required: ['sourceType'],
        properties: {
          sourceType: {
            type: 'string',
            enum: ['PROFILE', 'RESUME', 'JOB', 'CAREER_GOAL', 'SAVED_SEARCH'],
            example: 'PROFILE',
          },
          sourceId: {
            type: 'string',
            format: 'uuid',
            description:
              'Required for RESUME, JOB, CAREER_GOAL, and SAVED_SEARCH. Forbidden for PROFILE.',
          },
          filters: filtersSchema,
        },
      },
      responses: {
        200: {
          description: 'Recommendations generated',
          schema: successSchema('Recommendations generated', recommendationArraySchema),
        },
        422: {
          description: 'Invalid source payload or empty recommendation signal',
          schema: errorSchema(
            'Candidate profile does not contain titles, skills, or summary text for recommendations',
            'RECOMMENDATION_CONTEXT_INVALID',
          ),
        },
        ...commonRecommendationErrors,
      },
    },
    true,
    TAGS,
  ),

  createApiPost(
    `${BASE_URL}/from-text`,
    {
      summary: 'Generate recommendations from free-form target text',
      description:
        'Embeds the provided target text, retrieves PGVECTOR neighbors, scores candidates, and returns ranked results.',
      body: {
        required: ['targetText'],
        properties: {
          targetText: {
            type: 'string',
            minLength: 1,
            maxLength: 20000,
            example: 'Backend engineer with TypeScript and PostgreSQL',
          },
          filters: filtersSchema,
        },
      },
      responses: {
        200: {
          description: 'Recommendations generated',
          schema: successSchema('Recommendations generated', recommendationArraySchema),
        },
        422: {
          description: 'Target text missing or invalid filters',
          schema: errorSchema('Target text is required', 'TARGET_TEXT_REQUIRED'),
        },
        ...commonRecommendationErrors,
      },
    },
    true,
    TAGS,
  ),

  createApiGet(
    `${BASE_URL}/status`,
    {
      summary: 'Get recommendation readiness and lifecycle status',
      description:
        'Returns backward-compatible readiness booleans plus a lifecycleState for richer UI state handling.',
      responses: {
        200: {
          description: 'Recommendation readiness retrieved',
          schema: successSchema('Recommendation readiness retrieved', readinessStatusSchema),
        },
        ...commonRecommendationErrors,
      },
    },
    true,
    TAGS,
  ),

  createApiPost(
    `${BASE_URL}/refresh`,
    {
      summary: 'Refresh recommendations and return the created run',
      description:
        'Refresh is synchronous generation with freshness semantics. If body is empty, PROFILE is used. A successful refresh creates a new COMPLETED run, returns that run plus its first page of items, and makes lifecycle status READY unless a newer freshness blocker remains. The route is rate-limited as practical cooldown rather than idempotent.',
      body: {
        properties: {
          sourceType: {
            type: 'string',
            enum: ['PROFILE', 'RESUME', 'JOB', 'CAREER_GOAL', 'SAVED_SEARCH'],
            default: 'PROFILE',
            example: 'PROFILE',
          },
          sourceId: {
            type: 'string',
            format: 'uuid',
            description:
              'Required for RESUME, JOB, CAREER_GOAL, and SAVED_SEARCH. Forbidden for PROFILE.',
          },
          filters: filtersSchema,
        },
      },
      responses: {
        200: {
          description: 'Recommendations refreshed',
          schema: successSchema('Recommendations refreshed', recommendationRunPageSchema),
        },
        422: {
          description: 'Invalid source payload or empty recommendation signal',
          schema: errorSchema(
            'Candidate profile does not contain titles, skills, or summary text for recommendations',
            'RECOMMENDATION_CONTEXT_INVALID',
          ),
        },
        ...commonRecommendationErrors,
      },
    },
    true,
    TAGS,
  ),

  createApiGet(
    `${BASE_URL}/career-targets`,
    {
      summary: 'List career targets for the current user',
      description:
        'Returns only active career targets owned by the authenticated USER principal.',
      queryParams: [
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, default: 1 },
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      ],
      responses: {
        200: {
          description: 'Career targets retrieved',
          schema: successSchema('Career targets retrieved', careerTargetPageSchema),
        },
        ...commonRecommendationErrors,
      },
    },
    true,
    TAGS,
  ),

  createApiPost(
    `${BASE_URL}/career-targets`,
    {
      summary: 'Create a career target for the current user',
      description:
        'Persists a user-owned career goal that can be used as a CAREER_GOAL recommendation source.',
      body: {
        required: ['goalText'],
        properties: {
          goalText: { type: 'string', minLength: 1, maxLength: 20000 },
          structured: {
            type: 'object',
            additionalProperties: true,
            example: { targetRole: 'Automation QA Engineer' },
          },
        },
      },
      responses: {
        201: {
          description: 'Career target created',
          schema: successSchema('Career target created', careerTargetSchema),
        },
        ...commonRecommendationErrors,
      },
    },
    true,
    TAGS,
  ),

  createApiGet(
    `${BASE_URL}/career-targets/{careerTargetId}`,
    {
      summary: 'Get an owned career target',
      params: careerTargetIdParam,
      responses: {
        200: {
          description: 'Career target retrieved',
          schema: successSchema('Career target retrieved', careerTargetSchema),
        },
        ...commonRecommendationErrors,
        404: {
          description: 'Career target missing or not owned by caller',
          schema: errorSchema('Career target was not found', 'RECOMMENDATION_SOURCE_NOT_FOUND'),
        },
      },
    },
    true,
    TAGS,
  ),

  createApiDelete(
    `${BASE_URL}/career-targets/{careerTargetId}`,
    {
      summary: 'Archive an owned career target',
      params: careerTargetIdParam,
      responses: {
        200: {
          description: 'Career target archived',
          schema: successSchema('Career target archived'),
        },
        ...commonRecommendationErrors,
        404: {
          description: 'Career target missing or not owned by caller',
          schema: errorSchema('Career target was not found', 'RECOMMENDATION_SOURCE_NOT_FOUND'),
        },
      },
    },
    true,
    TAGS,
  ),

  createApiGet(
    `${BASE_URL}/saved-searches`,
    {
      summary: 'List saved searches for the current user',
      description:
        'Returns only non-deleted saved searches owned by the authenticated USER principal.',
      queryParams: [
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, default: 1 },
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      ],
      responses: {
        200: {
          description: 'Saved searches retrieved',
          schema: successSchema('Saved searches retrieved', savedSearchPageSchema),
        },
        ...commonRecommendationErrors,
      },
    },
    true,
    TAGS,
  ),

  createApiPost(
    `${BASE_URL}/saved-searches`,
    {
      summary: 'Create a saved search for the current user',
      description:
        'Persists query text, filters, and optional normalized context for future recommendation generation.',
      body: savedSearchWriteBody,
      responses: {
        201: {
          description: 'Saved search created',
          schema: successSchema('Saved search created', savedSearchSchema),
        },
        ...commonRecommendationErrors,
      },
    },
    true,
    TAGS,
  ),

  createApiGet(
    `${BASE_URL}/saved-searches/{savedSearchId}`,
    {
      summary: 'Get an owned saved search',
      params: savedSearchIdParam,
      responses: {
        200: {
          description: 'Saved search retrieved',
          schema: successSchema('Saved search retrieved', savedSearchSchema),
        },
        ...commonRecommendationErrors,
        404: {
          description: 'Saved search missing or not owned by caller',
          schema: errorSchema('Saved search was not found', 'RECOMMENDATION_SOURCE_NOT_FOUND'),
        },
      },
    },
    true,
    TAGS,
  ),

  createApiPatch(
    `${BASE_URL}/saved-searches/{savedSearchId}`,
    {
      summary: 'Update an owned saved search',
      params: savedSearchIdParam,
      body: {
        properties: savedSearchWriteBody.properties,
      },
      responses: {
        200: {
          description: 'Saved search updated',
          schema: successSchema('Saved search updated', savedSearchSchema),
        },
        ...commonRecommendationErrors,
        404: {
          description: 'Saved search missing or not owned by caller',
          schema: errorSchema('Saved search was not found', 'RECOMMENDATION_SOURCE_NOT_FOUND'),
        },
      },
    },
    true,
    TAGS,
  ),

  createApiDelete(
    `${BASE_URL}/saved-searches/{savedSearchId}`,
    {
      summary: 'Delete an owned saved search',
      params: savedSearchIdParam,
      responses: {
        200: {
          description: 'Saved search deleted',
          schema: successSchema('Saved search deleted'),
        },
        ...commonRecommendationErrors,
        404: {
          description: 'Saved search missing or not owned by caller',
          schema: errorSchema('Saved search was not found', 'RECOMMENDATION_SOURCE_NOT_FOUND'),
        },
      },
    },
    true,
    TAGS,
  ),

  createApiPost(
    `${BASE_URL}/saved-searches/{savedSearchId}/generate`,
    {
      summary: 'Generate recommendations from an owned saved search',
      description:
        'Shortcut for generating with sourceType=SAVED_SEARCH while enforcing ownership on the saved search source.',
      params: savedSearchIdParam,
      body: {
        properties: {
          filters: filtersSchema,
        },
      },
      responses: {
        200: {
          description: 'Recommendations generated',
          schema: successSchema('Recommendations generated', recommendationArraySchema),
        },
        ...commonRecommendationErrors,
        404: {
          description: 'Saved search missing or not owned by caller',
          schema: errorSchema('Saved search was not found', 'RECOMMENDATION_SOURCE_NOT_FOUND'),
        },
      },
    },
    true,
    TAGS,
  ),

  createApiGet(
    `${BASE_URL}/similar/{jobId}`,
    {
      summary: 'Find similar jobs for a catalog job',
      description:
        'Authorizes the source job from the public catalog, excludes it from neighbors, retrieves via PGVECTOR, and returns ranked scored matches.',
      params: [
        {
          name: 'jobId',
          in: 'path',
          required: true,
          description: 'Source job UUID',
          schema: {
            type: 'string',
            format: 'uuid',
            example: '11111111-1111-1111-1111-111111111111',
          },
        },
      ],
      queryParams: [
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Maximum number of similar jobs (1-100)',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      ],
      responses: {
        200: {
          description: 'Similar jobs retrieved',
          schema: successSchema('Similar jobs retrieved', {
            type: 'array',
            items: similarJobItemSchema,
          }),
        },
        ...commonRecommendationErrors,
      },
    },
    true,
    TAGS,
  ),

  createApiGet(
    BASE_URL,
    {
      summary: 'List persisted recommendations for the current user',
      description:
        'Stable pagination order: createdAt DESC (newest first), then rank ASC, then id ASC. Use runId to list one owned run, or latestOnly=true to list the latest owned run.',
      queryParams: [
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, default: 1 },
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
        {
          name: 'runId',
          in: 'query',
          required: false,
          description: 'Restrict recommendations to one owned run. Cannot be combined with latestOnly.',
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'latestOnly',
          in: 'query',
          required: false,
          description: 'When true, list recommendations only from the latest owned run.',
          schema: { type: 'boolean', default: false },
        },
      ],
      responses: {
        200: {
          description: 'Recommendations retrieved',
          schema: successSchema(
            'Recommendations retrieved',
            paginatedSchema(recommendationItemSchema),
          ),
        },
        ...commonRecommendationErrors,
      },
    },
    true,
    TAGS,
  ),

  createApiGet(
    `${BASE_URL}/runs/{runId}`,
    {
      summary: 'Get an owned recommendation run and its recommendations',
      description:
        'Returns run metadata plus paginated recommendations for that run. Non-owned and missing run ids both return 404.',
      params: [
        {
          name: 'runId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
            example: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          },
        },
      ],
      queryParams: [
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, default: 1 },
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      ],
      responses: {
        200: {
          description: 'Recommendation run retrieved',
          schema: successSchema('Recommendation run retrieved', recommendationRunPageSchema),
        },
        ...commonRecommendationErrors,
        404: {
          description: 'Run missing or not owned by caller',
          schema: errorSchema('Recommendation run was not found', 'RECOMMENDATION_RUN_NOT_FOUND'),
        },
      },
    },
    true,
    TAGS,
  ),

  createApiGet(
    `${BASE_URL}/{recommendationId}`,
    {
      summary: 'Get a persisted recommendation by id',
      params: [
        {
          name: 'recommendationId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
            example: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          },
        },
      ],
      responses: {
        200: {
          description: 'Recommendation retrieved',
          schema: successSchema('Recommendation retrieved', recommendationItemSchema),
        },
        ...commonRecommendationErrors,
      },
    },
    true,
    TAGS,
  ),

  createApiPost(
    `${BASE_URL}/{recommendationId}/feedback`,
    {
      summary: 'Upsert feedback for a recommendation',
      params: [
        {
          name: 'recommendationId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
            example: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          },
        },
      ],
      body: {
        required: ['action'],
        properties: {
          action: {
            type: 'string',
            enum: [...RECOMMENDATION_FEEDBACK_ACTION_VALUES],
            example: 'SAVED',
          },
          note: { type: 'string', maxLength: 1000 },
        },
      },
      responses: {
        200: {
          description: 'Recommendation feedback saved',
          schema: successSchema('Recommendation feedback saved', {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              recommendationId: { type: 'string', format: 'uuid' },
              action: { type: 'string', enum: [...RECOMMENDATION_FEEDBACK_ACTION_VALUES] },
              note: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          }),
        },
        ...commonRecommendationErrors,
      },
    },
    true,
    TAGS,
  ),
);
