import { createHash, randomUUID } from 'node:crypto';

import type {
  GenerationOptions,
  MailGenerationProvider,
  MailGenerationProviderRequest,
  MailGenerationProviderResult,
  ProviderHealthResult,
} from '@/modules/ai-mail/contracts/mail-generation-provider.contract.js';
import { env } from '@/shared/config/env.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

export type FakeMailGenerationMode =
  'success' | 'timeout' | 'malformed' | 'unsupported_claim' | 'unavailable';

const identifierFor = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

const recipientGreeting = (name?: string): string => (name ? `Hi ${name},` : 'Hello,');

const resolveMode = (mode?: FakeMailGenerationMode): FakeMailGenerationMode =>
  mode ?? (env.AI_MAIL_FAKE_MODE as FakeMailGenerationMode) ?? 'success';

const skillsFromRequest = (request: MailGenerationProviderRequest): string[] => {
  const { candidate, constraints, job, resume } = request.context;
  return constraints.emphasizeSkills.length
    ? constraints.emphasizeSkills
    : [...resume.skills, ...candidate.skills].slice(0, 3);
};

const buildBody = (request: MailGenerationProviderRequest, bodyText?: string): string => {
  const { candidate, constraints, job } = request.context;
  const role = job.roleTitle ?? 'the open role';
  const company = job.companyName ? ` at ${job.companyName}` : '';
  const skills = skillsFromRequest(request);
  const qualification =
    skills.length > 0
      ? `My experience with ${skills.join(', ')} aligns with the role's requirements.`
      : 'My background aligns with the role requirements described in the posting.';
  const resumeMention = constraints.includeResumeMention
    ? '\n\nI have included my resume for your review.'
    : '';
  const callToAction = constraints.includeCallToAction
    ? '\n\nI would welcome the opportunity to discuss how I could contribute.'
    : '';

  return (
    bodyText ??
    `${recipientGreeting(job.recruiterName)}\n\nI am writing to express my interest in ${role}${company}. ${qualification}${resumeMention}${callToAction}\n\nBest regards,\n${candidate.fullName}`
  );
};

const buildSuccessOutput = (
  request: MailGenerationProviderRequest,
  subject?: string,
  bodyText?: string,
): unknown => {
  const { job } = request.context;
  const role = job.roleTitle ?? 'the open role';
  const skills = skillsFromRequest(request);
  const currentSubject = request.currentDraft?.subject;
  const currentBody = request.currentDraft?.bodyText;

  if (request.operation === 'generate_subject') {
    return {
      subject: subject ?? `Interest in ${role}`,
      bodyText: currentBody ?? buildBody(request),
      detectedContext: {
        roleTitle: job.roleTitle,
        companyName: job.companyName,
        recruiterName: job.recruiterName,
      },
      highlightedQualifications: skills.map((claim) => ({
        claim,
        evidenceCategory: 'skill' as const,
      })),
      warnings: [],
    };
  }

  if (
    request.operation === 'rewrite_selection' &&
    request.selectedText &&
    currentBody?.includes(request.selectedText)
  ) {
    const rewritten = request.rewriteInstruction?.instruction
      ? `${request.selectedText} (${request.rewriteInstruction.instruction})`
      : `${request.selectedText} (revised)`;
    return {
      subject: subject ?? currentSubject ?? `Application for ${role}`,
      bodyText: currentBody.replace(request.selectedText, rewritten),
      detectedContext: {
        roleTitle: job.roleTitle,
        companyName: job.companyName,
        recruiterName: job.recruiterName,
      },
      highlightedQualifications: skills.map((claim) => ({
        claim,
        evidenceCategory: 'skill' as const,
      })),
      warnings: [],
    };
  }

  return {
    subject: subject ?? currentSubject ?? `Application for ${role}`,
    bodyText: buildBody(request, bodyText ?? currentBody),
    detectedContext: {
      roleTitle: job.roleTitle,
      companyName: job.companyName,
      recruiterName: job.recruiterName,
    },
    highlightedQualifications: skills.map((claim) => ({
      claim,
      evidenceCategory: 'skill' as const,
    })),
    warnings: [],
  };
};

const assertNotAborted = (options?: GenerationOptions): void => {
  if (options?.signal?.aborted) {
    throw new DOMException('Mail generation was cancelled', 'AbortError');
  }
};

export class FakeMailGenerationProvider implements MailGenerationProvider {
  readonly providerName = 'fake';

  constructor(private readonly mode: FakeMailGenerationMode = resolveMode()) {}

  async generate(
    request: MailGenerationProviderRequest,
    options?: GenerationOptions,
  ): Promise<MailGenerationProviderResult> {
    assertNotAborted(options);

    switch (this.mode) {
      case 'timeout':
        throw new AppError('Fake provider timed out', 504, 'AI_MAIL_PROVIDER_TIMEOUT');
      case 'unavailable':
        throw new AppError('Fake provider unavailable', 503, 'AI_MAIL_PROVIDER_UNAVAILABLE');
      case 'malformed':
        return {
          provider: this.providerName,
          model: 'deterministic-template-v1',
          requestId: `fake-${identifierFor(request)}`,
          output: { unexpected: true },
          durationMs: 0,
        };
      case 'unsupported_claim':
        return {
          provider: this.providerName,
          model: 'deterministic-template-v1',
          requestId: `fake-${identifierFor(request)}`,
          output: {
            subject: 'Application',
            bodyText: 'I led a mission to Mars with zero evidence.',
            detectedContext: {},
            highlightedQualifications: [
              { claim: 'Led a mission to Mars', evidenceCategory: 'achievement' },
            ],
            warnings: [],
          },
          durationMs: 0,
        };
      case 'success':
      default:
        return {
          provider: this.providerName,
          model: 'deterministic-template-v1',
          requestId: `fake-${randomUUID()}`,
          output: buildSuccessOutput(request),
          usage: { inputTokenCount: 100, outputTokenCount: 250 },
          durationMs: 5,
        };
    }
  }

  async regenerateMail(
    request: MailGenerationProviderRequest,
    options?: GenerationOptions,
  ): Promise<MailGenerationProviderResult> {
    return this.generate(request, options);
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    return {
      healthy: this.mode !== 'unavailable',
      provider: this.providerName,
      checkedAt: new Date().toISOString(),
      reason: this.mode === 'unavailable' ? 'Simulated outage' : undefined,
    };
  }
}
