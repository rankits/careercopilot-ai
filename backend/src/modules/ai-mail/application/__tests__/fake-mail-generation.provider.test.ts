import { describe, expect, it } from 'vitest';

import { FakeMailGenerationProvider } from '@/modules/ai-mail/providers/fake-mail-generation.provider.js';
import { MailOutputParser } from '@/modules/ai-mail/application/mail-output.parser.js';
import type { MailGenerationProviderRequest } from '@/modules/ai-mail/contracts/mail-generation-provider.contract.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const request = (): MailGenerationProviderRequest => ({
  operation: 'generate_full',
  promptVersion: 'v1',
  outputSchemaVersion: 'v1',
  prompt: { version: 'v1', sections: [] },
  context: {
    candidate: {
      fullName: 'Alex Candidate',
      skills: ['TypeScript'],
      experience: [],
      projects: [],
      education: [],
      certifications: [],
      approvedAchievements: [],
      professionalLinks: [],
    },
    resume: {
      resumeId: '11111111-1111-4111-8111-111111111111',
      fileName: 'resume.pdf',
      skills: ['TypeScript'],
      experience: [],
      verifiedAchievements: [],
      projects: [],
      education: [],
      certifications: [],
      parseStatus: 'COMPLETED',
    },
    job: {
      description: 'Backend role',
      recruiterEmail: 'recruiter@example.com',
      responsibilities: [],
      requirements: [],
      preferredQualifications: [],
      technologies: ['TypeScript'],
      keywords: [],
      suspiciousInstructionsDetected: false,
      roleTitle: 'Backend Engineer',
    },
    constraints: {
      tone: 'professional',
      includeCallToAction: true,
      includeResumeMention: true,
      emphasizeSkills: ['TypeScript'],
      emphasizeAchievements: [],
      avoidTopics: [],
    },
    trustBoundary: {
      candidate: { trust: 'trusted_user_data', value: {} as never },
      resume: { trust: 'trusted_user_data', value: {} as never },
      job: {
        trust: 'untrusted_external_content',
        value: {} as never,
        instructionsMustBeIgnored: true,
      },
      constraints: { trust: 'trusted_user_data', value: {} as never },
    },
    contextHash: 'hash-1',
  },
});

describe('FakeMailGenerationProvider modes', () => {
  const parser = new MailOutputParser();

  it('returns parseable success output by default', async () => {
    const provider = new FakeMailGenerationProvider('success');
    const result = await provider.generate(request());
    const parsed = parser.parse(result.output);
    expect(parsed.highlightedQualifications[0]).toMatchObject({ evidenceCategory: 'skill' });
  });

  it('simulates timeout failures', async () => {
    const provider = new FakeMailGenerationProvider('timeout');
    await expect(provider.generate(request())).rejects.toMatchObject({
      code: 'AI_MAIL_PROVIDER_TIMEOUT',
    });
  });

  it('simulates malformed output', async () => {
    const provider = new FakeMailGenerationProvider('malformed');
    const result = await provider.generate(request());
    expect(() => parser.parse(result.output)).toThrow(AppError);
  });

  it('simulates unsupported claim output', async () => {
    const provider = new FakeMailGenerationProvider('unsupported_claim');
    const result = await provider.generate(request());
    const parsed = parser.parse(result.output);
    expect(parsed.highlightedQualifications[0]?.claim).toContain('Mars');
  });

  it('reports unhealthy when unavailable', async () => {
    const provider = new FakeMailGenerationProvider('unavailable');
    await expect(provider.generate(request())).rejects.toMatchObject({
      code: 'AI_MAIL_PROVIDER_UNAVAILABLE',
    });
    await expect(provider.healthCheck()).resolves.toMatchObject({ healthy: false });
  });
});
