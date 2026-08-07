import { describe, expect, it, vi } from 'vitest';

import { AiMailGenerationReadinessService } from '@/modules/ai-mail/application/ai-mail-generation-readiness.service.js';
import { CandidateProfileContextBuilder } from '@/modules/ai-mail/application/candidate-profile-context.builder.js';
import { JobContextBuilder } from '@/modules/ai-mail/application/job-context.builder.js';
import { JobDescriptionNormalizer } from '@/modules/ai-mail/application/job-description-normalizer.js';
import { MailGenerationContextBuilder } from '@/modules/ai-mail/application/mail-generation-context.builder.js';
import {
  ResumeContextBuilder,
  ResumeContextLoader,
} from '@/modules/ai-mail/application/resume-context.builder.js';
import type { AiMailDraftRepository } from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import type { CandidateProfileContextRepository } from '@/modules/ai-mail/contracts/candidate-profile-context.repository.js';
import type {
  ResumeContextRepository,
  SafeResumeRecord,
} from '@/modules/ai-mail/contracts/resume-context.repository.js';
import type { AiMailDraft } from '@/modules/ai-mail/domain/ai-mail.types.js';

const limits = {
  maxProfileSkills: 50,
  maxExperienceEntries: 10,
  maxExperienceHighlightsPerEntry: 8,
  maxProjects: 10,
  maxAchievements: 20,
};

const draft = (overrides: Partial<AiMailDraft> = {}): AiMailDraft => ({
  id: 'draft-1',
  userId: 'user-1',
  recruiterEmail: 'recruiter@example.com',
  recruiterName: 'Sam',
  companyName: 'Acme',
  roleTitle: 'Engineer',
  jobDescription: 'Requirements:\n- TypeScript\nResponsibilities:\n- Build APIs',
  resumeId: 'resume-1',
  constraints: {
    tone: 'professional',
    includeCallToAction: true,
    includeResumeMention: true,
    emphasizeSkills: [],
    emphasizeAchievements: [],
    avoidTopics: [],
  },
  status: 'input',
  version: 1,
  userEdited: false,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  ...overrides,
});

const resumeRecord = (): SafeResumeRecord => ({
  id: 'resume-1',
  fileName: 'resume.pdf',
  originalName: 'Ada.pdf',
  status: 'PROCESSED',
  uploadedAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
  processedAt: new Date('2026-01-01T00:01:00Z'),
  latestParse: {
    status: 'COMPLETED',
    parsedData: {
      skills: ['TypeScript'],
      personalDetails: { name: 'Ada Lovelace', currentRole: 'Engineer' },
      experience: [{ title: 'Engineer', company: 'Analytical Engines' }],
      education: [{ institution: 'University' }],
      summary: 'Builder of analytical engines',
    },
    extractedData: null,
  },
});

const buildService = (options?: {
  draftOverride?: Partial<AiMailDraft> | null;
  profile?: Awaited<ReturnType<CandidateProfileContextRepository['findForUser']>>;
  resume?: SafeResumeRecord | null;
}) => {
  const drafts: AiMailDraftRepository = {
    create: vi.fn(),
    listForUser: vi.fn(),
    findByIdForUser: vi.fn(async () =>
      options?.draftOverride === null ? null : draft(options?.draftOverride),
    ),
    updateForUser: vi.fn(),
    archiveForUser: vi.fn(),
    resumeBelongsToUser: vi.fn(async () => true),
    createAttempt: vi.fn(),
    updateAttempt: vi.fn(),
    listAttemptsForDraft: vi.fn(async () => []),
    countAttemptsForUserSince: vi.fn(async () => 0),
    countRegenerationsForDraft: vi.fn(async () => 0),
    findAttemptByIdempotency: vi.fn(async () => null),
    createRevision: vi.fn(),
    listRevisionsForDraft: vi.fn(async () => []),
    findRevisionForUser: vi.fn(async () => null),
    countRevisionsForDraft: vi.fn(async () => 0),
  };
  const profiles: CandidateProfileContextRepository = {
    findForUser: vi.fn(async () =>
      options?.profile === undefined
        ? {
            personalDetails: {
              fullName: 'Ada Lovelace',
              currentRole: 'Engineer',
              location: 'London',
            },
            experience: [{ title: 'Engineer', company: 'Analytical Engines' }],
            education: [{ institution: 'University' }],
            skills: ['TypeScript', 'React'],
            certifications: [],
            confirmedAt: new Date(),
            links: { linkedin: 'https://linkedin.com/in/ada' },
          }
        : options.profile,
    ),
  };
  const resumes: ResumeContextRepository = {
    findForUser: vi.fn(async () =>
      options && 'resume' in (options ?? {}) ? (options.resume ?? null) : resumeRecord(),
    ),
    listForUser: vi.fn(async () =>
      options && 'resume' in (options ?? {})
        ? options.resume
          ? [options.resume]
          : []
        : [resumeRecord()],
    ),
    selectionHints: vi.fn(async () => ({ sourceResumeId: 'resume-1' })),
  };
  return new AiMailGenerationReadinessService(
    drafts,
    profiles,
    new CandidateProfileContextBuilder(limits),
    new ResumeContextLoader(resumes, new ResumeContextBuilder(limits)),
    new JobDescriptionNormalizer(20_000),
    new JobContextBuilder({
      maxJobRequirements: 30,
      maxJobResponsibilities: 30,
      maxJobKeywords: 50,
    }),
    new MailGenerationContextBuilder(),
  );
};

describe('AiMailGenerationReadinessService', () => {
  it('marks a complete draft ready with safe statistics', async () => {
    const result = await buildService().evaluate('user-1', 'draft-1');
    expect(result.ready).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.counts.resumeSkills).toBeGreaterThan(0);
    expect(result.contextHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(result)).not.toMatch(/trustBoundary|evidence|salary|ssn/i);
  });

  it('blocks missing job description and invalid recruiter email', async () => {
    const result = await buildService({
      draftOverride: {
        jobDescription: '   ',
        recruiterEmail: 'not-an-email',
      },
    }).evaluate('user-1', 'draft-1');
    expect(result.ready).toBe(false);
    expect(result.blockers.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'AI_MAIL_JOB_DESCRIPTION_MISSING',
        'AI_MAIL_RECRUITER_EMAIL_INVALID',
      ]),
    );
  });

  it('blocks processing resumes and warns for incomplete profiles', async () => {
    const result = await buildService({
      resume: {
        ...resumeRecord(),
        status: 'PROCESSING',
        latestParse: undefined,
      },
      profile: {
        personalDetails: { fullName: 'Ada' },
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        confirmedAt: null,
      },
    }).evaluate('user-1', 'draft-1');
    expect(result.ready).toBe(false);
    expect(result.blockers.some((item) => item.code === 'AI_MAIL_RESUME_PROCESSING')).toBe(true);
    expect(result.warnings.some((item) => item.code === 'AI_MAIL_PROFILE_INCOMPLETE')).toBe(true);
  });

  it('warns when company is inferred and recruiter name is missing', async () => {
    const result = await buildService({
      draftOverride: {
        companyName: undefined,
        recruiterName: undefined,
        jobDescription:
          'Company: Inferred Co\n\nRole: Backend Engineer\n\nRequirements:\n- TypeScript',
      },
    }).evaluate('user-1', 'draft-1');
    expect(result.ready).toBe(true);
    expect(result.warnings.map((item) => item.code)).toEqual(
      expect.arrayContaining(['AI_MAIL_COMPANY_INFERRED', 'AI_MAIL_RECRUITER_NAME_MISSING']),
    );
    expect(result.suggestedJobMetadata.companyName).toMatch(/^Inferred Co\b/);
  });
});
