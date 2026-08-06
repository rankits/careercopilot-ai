import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { copilotService } from '@/modules/copilot/services/copilot.service.js';
import type { CopilotChatInput } from '@/modules/copilot/validations/copilot.schema.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const mocks = vi.hoisted(() => ({
  chatWithOpenRouter: vi.fn(),
  buildCopilotChatUserPrompt: vi.fn(() => 'user prompt'),
  jobListingService: { getJobDetails: vi.fn() },
  resumeRepository: { findCandidateProfileByUserId: vi.fn() },
  resumeConfig: {
    ai: {
      openrouter: {
        apiKey: 'test-key',
        model: 'openai/gpt-4o-mini',
        baseUrl: 'https://openrouter.ai/api/v1',
        timeoutMs: 60000,
      },
      temperature: 0.5,
    },
  },
}));

vi.mock('@/modules/copilot/ai/openrouter-chat.js', () => ({
  chatWithOpenRouter: mocks.chatWithOpenRouter,
}));

vi.mock('@/modules/copilot/ai/prompts/copilot-chat.prompt.js', () => ({
  buildCopilotChatUserPrompt: mocks.buildCopilotChatUserPrompt,
  COPILOT_CHAT_SYSTEM_PROMPT: 'system',
}));

vi.mock('@/modules/job-listing/index.js', () => ({
  jobListingService: mocks.jobListingService,
}));

vi.mock('@/modules/resumes/repositories/resume.repository.js', () => ({
  resumeRepository: mocks.resumeRepository,
}));

vi.mock('@/modules/resumes/config/resume.config.js', () => ({
  resumeConfig: mocks.resumeConfig,
}));

const JOB_ID = '123e4567-e89b-12d3-a456-426614174000';

const defaultContext = () => ({
  jobId: JOB_ID,
  job: {
    id: JOB_ID,
    title: 'Engineer',
    company: 'Acme',
    descriptionText: 'Exciting role',
    skills: ['Node', 'TypeScript'],
  },
  resume: { skills: ['Node'] },
  profile: { fullName: 'Ada' },
  applications: [{ company: 'Acme', status: 'applied', title: 'Engineer' }],
  extra: { region: 'US' },
});

const makeInput = (overrides: Partial<CopilotChatInput> = {}): CopilotChatInput => ({
  message: 'help me improve',
  page: 'dashboard',
  context: defaultContext(),
  ...overrides,
});

const profile = {
  confirmedAt: new Date('2026-01-01'),
  personalDetails: { fullName: 'Ada' },
  certifications: ['AWS'],
  education: [{ degree: 'BSc' }],
  experience: [{ role: 'SWE' }],
  skills: ['Node'],
  sourceResumeId: 'resume-1',
};

const jobDetails = {
  id: 'job-1',
  title: 'Engineer',
  descriptionText: 'role',
  descriptionHtml: undefined,
  benefits: ['Health'],
  company: 'Acme',
  companyIndustry: 'Tech',
  companySize: '10-50',
  employmentType: 'Full-time',
  location: 'Remote',
  salary: '100k',
  skills: ['Node'],
  tags: ['remote'],
};

const replayChat = () => {
  mocks.chatWithOpenRouter.mockResolvedValue('advice');
  mocks.resumeRepository.findCandidateProfileByUserId.mockResolvedValue(profile);
  mocks.jobListingService.getJobDetails.mockResolvedValue(jobDetails);
};

const lastPrompt = () => mocks.buildCopilotChatUserPrompt.mock.calls[0][0];

const expectAppError = async (promise: Promise<unknown>, statusCode: number, code: string) => {
  try {
    await promise;
    throw new Error('expected an AppError to be thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    if (error instanceof AppError) {
      expect(error.statusCode).toBe(statusCode);
      expect(error.code).toBe(code);
    }
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mocks.resumeConfig.ai.openrouter, {
    apiKey: 'test-key',
    model: 'openai/gpt-4o-mini',
    baseUrl: 'https://openrouter.ai/api/v1',
    timeoutMs: 60000,
  });
  mocks.resumeConfig.ai.temperature = 0.5;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('copilotService.chat guards', () => {
  it('throws COPILOT_UNAVAILABLE when openrouter apiKey is blank', async () => {
    mocks.resumeConfig.ai.openrouter.apiKey = '   ';

    await expectAppError(copilotService.chat('user-1', makeInput()), 503, 'COPILOT_UNAVAILABLE');
    expect(mocks.chatWithOpenRouter).not.toHaveBeenCalled();
  });
});

describe('copilotService.chat happy path', () => {
  it('builds a request from db profile, job details, and client context', async () => {
    replayChat();

    const result = await copilotService.chat('user-1', makeInput());

    expect(result).toEqual({ reply: 'advice' });
    expect(mocks.resumeRepository.findCandidateProfileByUserId).toHaveBeenCalledWith('user-1');
    expect(mocks.jobListingService.getJobDetails).toHaveBeenCalledWith(JOB_ID);
    expect(mocks.chatWithOpenRouter).toHaveBeenCalledTimes(1);

    const promptArg = lastPrompt();
    expect(promptArg).toMatchObject({ message: 'help me improve', page: 'dashboard' });
    expect(typeof promptArg.resumeSummary).toBe('string');
    expect(typeof promptArg.profileSummary).toBe('string');
    expect(typeof promptArg.jobSummary).toBe('string');
    expect(typeof promptArg.applicationsSummary).toBe('string');
    expect(typeof promptArg.extraContext).toBe('string');

    const chatArgs = mocks.chatWithOpenRouter.mock.calls[0];
    expect(chatArgs[1]).toMatchObject({
      apiKey: 'test-key',
      model: 'openai/gpt-4o-mini',
      temperature: 0.5,
      timeoutMs: 60000,
    });
    expect(chatArgs[0].messages).toEqual([
      { role: 'system', content: 'system' },
      { role: 'user', content: 'user prompt' },
    ]);
  });

  it('falls back to client-context resume/profile when no db profile exists', async () => {
    replayChat();
    mocks.resumeRepository.findCandidateProfileByUserId.mockResolvedValue(null);

    await copilotService.chat('user-1', makeInput());

    const promptArg = lastPrompt();
    expect(typeof promptArg.resumeSummary).toBe('string');
    expect(typeof promptArg.profileSummary).toBe('string');
  });
});

describe('copilotService.chat job-summary variants', () => {
  it('uses the client job context when the listing is not found', async () => {
    replayChat();
    mocks.jobListingService.getJobDetails.mockResolvedValue(null);

    await copilotService.chat('user-1', makeInput());

    expect(mocks.jobListingService.getJobDetails).toHaveBeenCalledWith(JOB_ID);
    expect(typeof lastPrompt().jobSummary).toBe('string');
  });

  it('uses the client job context when no jobId is present', async () => {
    replayChat();
    mocks.jobListingService.getJobDetails.mockResolvedValue(null);
    const { jobId: _dropped, job: _droppedJob, ...contextWithoutJobId } = defaultContext();
    contextWithoutJobId.job = { ...defaultContext().job, id: undefined };

    await copilotService.chat('user-1', makeInput({ context: contextWithoutJobId }));

    expect(mocks.jobListingService.getJobDetails).not.toHaveBeenCalled();
    expect(typeof lastPrompt().jobSummary).toBe('string');
  });

  it('omits the job summary when there is no job at all', async () => {
    replayChat();
    mocks.jobListingService.getJobDetails.mockResolvedValue(null);
    const context = {
      resume: { skills: ['Node'] },
      profile: { fullName: 'Ada' },
      applications: [],
    };

    await copilotService.chat('user-1', makeInput({ context }));

    expect(lastPrompt().jobSummary).toBeUndefined();
    expect(lastPrompt().applicationsSummary).toBeUndefined();
  });

  it('falls back to descriptionHtml when descriptionText is empty', async () => {
    replayChat();
    mocks.jobListingService.getJobDetails.mockResolvedValue({
      ...jobDetails,
      descriptionText: '',
      descriptionHtml: '<p>HTML role</p>',
    });

    await copilotService.chat('user-1', makeInput());

    expect(mocks.chatWithOpenRouter).toHaveBeenCalledTimes(1);
    expect(typeof lastPrompt().jobSummary).toBe('string');
  });
});

describe('copilotService.chat summary formatting branches', () => {
  const cases = [
    { name: 'string resume', resume: 'plain summary', expectSummary: true },
    { name: 'non-empty array', resume: ['a', 'b'], expectSummary: true },
    { name: 'non-empty object', resume: { a: 1 }, expectSummary: true },
    { name: 'empty array', resume: [], expectSummary: false },
    { name: 'empty object', resume: {}, expectSummary: false },
    { name: 'blank string', resume: '   ', expectSummary: false },
    { name: 'undefined resume', resume: undefined, expectSummary: false },
    { name: 'very long resume', resume: 'x'.repeat(6001), expectSummary: true },
  ];

  it.each(cases)(
    'handles a $name in the client resume context',
    async ({ resume, expectSummary }) => {
      replayChat();
      mocks.resumeRepository.findCandidateProfileByUserId.mockResolvedValue(null);

      await copilotService.chat('user-1', makeInput({ context: { resume } }));

      const promptArg = lastPrompt();
      if (expectSummary) {
        expect(typeof promptArg.resumeSummary).toBe('string');
      } else {
        expect(promptArg.resumeSummary).toBeUndefined();
      }
    },
  );

  it('falls back to undefined when JSON serialization fails', async () => {
    replayChat();
    mocks.resumeRepository.findCandidateProfileByUserId.mockResolvedValue(null);
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    await copilotService.chat('user-1', makeInput({ context: { resume: circular } }));

    expect(lastPrompt().resumeSummary).toBeUndefined();
  });
});

describe('copilotService.chat provider error mapping', () => {
  it('maps a >=500 provider error to a generic unavailable message', async () => {
    replayChat();
    mocks.chatWithOpenRouter.mockRejectedValue(
      Object.assign(new Error('upstream exploded'), { status: 503 }),
    );

    await expectAppError(copilotService.chat('user-1', makeInput()), 503, 'COPILOT_PROVIDER_ERROR');
  });

  it('preserves a client-class provider error message and status', async () => {
    replayChat();
    mocks.chatWithOpenRouter.mockRejectedValue(
      Object.assign(new Error('quota exceeded'), { status: 429 }),
    );

    const promise = copilotService.chat('user-1', makeInput());
    await expect(promise).rejects.toMatchObject({
      statusCode: 429,
      code: 'COPILOT_PROVIDER_ERROR',
      message: 'quota exceeded',
    });
  });

  it('maps a sub-4xx numeric status to 502 while preserving the source message', async () => {
    replayChat();
    mocks.chatWithOpenRouter.mockRejectedValue(
      Object.assign(new Error('weird status'), { status: 200 }),
    );

    const promise = copilotService.chat('user-1', makeInput());
    await expect(promise).rejects.toMatchObject({
      statusCode: 502,
      code: 'COPILOT_PROVIDER_ERROR',
      message: 'weird status',
    });
  });

  it('maps a plain Error without status to a 502', async () => {
    replayChat();
    mocks.chatWithOpenRouter.mockRejectedValue(new Error('network flake'));

    const promise = copilotService.chat('user-1', makeInput());
    await expect(promise).rejects.toMatchObject({
      statusCode: 502,
      code: 'COPILOT_PROVIDER_ERROR',
    });
  });

  it('falls back to a default message for non-Error rejections', async () => {
    replayChat();
    mocks.chatWithOpenRouter.mockRejectedValue('something exploded');

    const promise = copilotService.chat('user-1', makeInput());
    await expect(promise).rejects.toMatchObject({
      statusCode: 502,
      code: 'COPILOT_PROVIDER_ERROR',
      message: 'Career Copilot is temporarily unavailable. Please try again.',
    });
  });
});
