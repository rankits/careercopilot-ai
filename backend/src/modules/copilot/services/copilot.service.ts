import { chatWithOpenRouter } from '@/modules/copilot/ai/openrouter-chat.js';
import {
  buildCopilotChatUserPrompt,
  COPILOT_CHAT_SYSTEM_PROMPT,
} from '@/modules/copilot/ai/prompts/copilot-chat.prompt.js';
import type { CopilotChatInput } from '@/modules/copilot/validations/copilot.schema.js';
import { jobListingService } from '@/modules/job-listing/index.js';
import { resumeRepository } from '@/modules/resumes/repositories/resume.repository.js';
import { resumeConfig } from '@/modules/resumes/config/resume.config.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const truncate = (value: string, max = 6000): string =>
  value.length > max ? `${value.slice(0, max)}…` : value;

const formatJsonBlock = (label: string, value: unknown): string | undefined => {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? `${label}:\n${truncate(trimmed)}` : undefined;
  }
  if (Array.isArray(value) && value.length === 0) return undefined;
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
    return undefined;
  }
  try {
    return `${label}:\n${truncate(JSON.stringify(value, null, 2))}`;
  } catch {
    return undefined;
  }
};

const buildResumeSummaryFromDb = async (userId: string): Promise<string | undefined> => {
  const profile = await resumeRepository.findCandidateProfileByUserId(userId);
  if (!profile) return undefined;

  return formatJsonBlock('Candidate profile', {
    certifications: profile.certifications,
    education: profile.education,
    experience: profile.experience,
    isComplete: Boolean(profile.confirmedAt),
    personalDetails: profile.personalDetails,
    skills: profile.skills,
    sourceResumeId: profile.sourceResumeId,
  });
};

const buildJobSummary = async (
  context: CopilotChatInput['context'],
): Promise<string | undefined> => {
  const jobId = context.jobId ?? context.job?.id;
  if (jobId) {
    const details = await jobListingService.getJobDetails(jobId);
    if (details) {
      return formatJsonBlock('Job listing', {
        benefits: details.benefits,
        company: details.company,
        companyIndustry: details.companyIndustry,
        companySize: details.companySize,
        description: details.descriptionText || details.descriptionHtml,
        employmentType: details.employmentType,
        id: details.id,
        location: details.location,
        salary: details.salary,
        skills: details.skills,
        tags: details.tags,
        title: details.title,
      });
    }
  }

  if (context.job) {
    return formatJsonBlock('Job listing (client context)', context.job);
  }

  return undefined;
};

const buildApplicationsSummary = (context: CopilotChatInput['context']): string | undefined => {
  if (!context.applications?.length) return undefined;
  return formatJsonBlock('Application tracker snapshot', context.applications);
};

export const copilotService = {
  async chat(userId: string, input: CopilotChatInput): Promise<{ reply: string }> {
    const openrouter = resumeConfig.ai.openrouter;
    if (!openrouter.apiKey.trim()) {
      throw new AppError(
        'Career Copilot is temporarily unavailable. OpenRouter is not configured.',
        503,
        'COPILOT_UNAVAILABLE',
      );
    }

    const [resumeFromDb, jobSummary] = await Promise.all([
      buildResumeSummaryFromDb(userId),
      buildJobSummary(input.context),
    ]);

    const resumeSummary =
      resumeFromDb || formatJsonBlock('Resume (client context)', input.context.resume) || undefined;

    const profileSummary =
      formatJsonBlock('Account profile (client context)', input.context.profile) || undefined;

    const applicationsSummary = buildApplicationsSummary(input.context);
    const extraContext = formatJsonBlock('Extra context', input.context.extra);

    const userPrompt = buildCopilotChatUserPrompt({
      applicationsSummary,
      extraContext,
      jobSummary,
      message: input.message,
      page: input.page,
      profileSummary,
      resumeSummary,
    });

    try {
      const reply = await chatWithOpenRouter(
        {
          messages: [
            { role: 'system', content: COPILOT_CHAT_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          maxTokens: 1500,
          temperature: 0.5,
        },
        {
          apiKey: openrouter.apiKey,
          baseUrl: openrouter.baseUrl,
          model: openrouter.model,
          temperature: resumeConfig.ai.temperature,
          timeoutMs: openrouter.timeoutMs,
        },
      );

      return { reply };
    } catch (error) {
      const status =
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof (error as { status?: unknown }).status === 'number'
          ? (error as { status: number }).status
          : 502;

      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Career Copilot failed to generate a response';

      throw new AppError(
        status >= 500 ? 'Career Copilot is temporarily unavailable. Please try again.' : message,
        status >= 400 && status < 600 ? status : 502,
        'COPILOT_PROVIDER_ERROR',
      );
    }
  },
};

export default copilotService;
