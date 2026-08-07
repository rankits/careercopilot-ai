import { describe, expect, it } from 'vitest';

import { MailTruthfulnessValidator } from '@/modules/ai-mail/application/mail-truthfulness.validator.js';
import type {
  ContextEvidence,
  GeneratedMailOutput,
  MailGenerationContext,
} from '@/modules/ai-mail/domain/ai-mail.types.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const baseContext = (): MailGenerationContext => ({
  candidate: {
    fullName: 'Alex Candidate',
    skills: ['TypeScript', 'Node.js'],
    experience: [{ roleTitle: 'Engineer', companyName: 'Acme', current: true, highlights: [] }],
    projects: [],
    education: [],
    certifications: ['AWS Certified'],
    approvedAchievements: ['Reduced latency by 30%'],
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
    description: 'Requires TypeScript and mission to Mars',
    recruiterEmail: 'recruiter@example.com',
    responsibilities: ['Mission to Mars'],
    requirements: [],
    preferredQualifications: [],
    technologies: ['TypeScript'],
    keywords: [],
    suspiciousInstructionsDetected: false,
  },
  constraints: {
    tone: 'professional',
    includeCallToAction: true,
    includeResumeMention: true,
    emphasizeSkills: [],
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
});

const evidence: ContextEvidence[] = [
  {
    path: 'resume.skill[0]',
    source: 'resume',
    sensitivity: 'professional',
    category: 'skill',
    value: 'TypeScript',
  },
];

describe('MailTruthfulnessValidator', () => {
  const validator = new MailTruthfulnessValidator();

  it('blocks unsupported claims', () => {
    const output: GeneratedMailOutput = {
      subject: 'Hello',
      bodyText: 'Body',
      detectedContext: {},
      highlightedQualifications: [
        { claim: 'Led a mission to Mars', evidenceCategory: 'achievement' },
      ],
      warnings: [],
    };

    expect(() => validator.validate(output, baseContext(), evidence)).toThrowError(AppError);
    try {
      validator.validate(output, baseContext(), evidence);
    } catch (error) {
      expect(error).toMatchObject({ code: 'AI_MAIL_UNSUPPORTED_CLAIM' });
    }
  });

  it('warns on uncertain claims', () => {
    const output: GeneratedMailOutput = {
      subject: 'Hello',
      bodyText: 'Body',
      detectedContext: {},
      highlightedQualifications: [
        { claim: 'Engineer at Acme delivering results', evidenceCategory: 'experience' },
      ],
      warnings: [],
    };

    const result = validator.validate(output, baseContext(), evidence);
    expect(
      result.warnings.some((warning) => warning.code === 'AI_MAIL_CLAIM_REVIEW_REQUIRED'),
    ).toBe(true);
  });
});
