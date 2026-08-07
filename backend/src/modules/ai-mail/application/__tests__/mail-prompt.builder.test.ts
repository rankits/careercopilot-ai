import { describe, expect, it } from 'vitest';

import { MailPromptBuilder } from '@/modules/ai-mail/application/mail-prompt.builder.js';
import type { MailGenerationContext } from '@/modules/ai-mail/domain/ai-mail.types.js';
import { AI_MAIL_PROMPT_VERSION } from '@/modules/ai-mail/domain/mail-prompt-policy.js';

const context = (): MailGenerationContext => ({
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
    skills: ['Node.js'],
    experience: [],
    verifiedAchievements: [],
    projects: [],
    education: [],
    certifications: [],
    parseStatus: 'COMPLETED',
  },
  job: {
    description: 'Build APIs',
    recruiterEmail: 'recruiter@example.com',
    recruiterName: 'Jane',
    companyName: 'Acme',
    roleTitle: 'Backend Engineer',
    responsibilities: [],
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

describe('MailPromptBuilder', () => {
  it('builds explicit prompt sections for generation', () => {
    const builder = new MailPromptBuilder();
    const prompt = builder.build({ operation: 'generate_full', context: context() });

    expect(prompt.version).toBe(AI_MAIL_PROMPT_VERSION);
    expect(prompt.sections.map((section) => section.id)).toEqual([
      'SYSTEM_POLICY',
      'USER_CONSTRAINTS',
      'CANDIDATE_PROFILE_DATA',
      'SELECTED_RESUME_DATA',
      'JOB_DESCRIPTION_DATA',
      'TASK',
    ]);
    expect(prompt.sections.find((section) => section.id === 'TASK')?.content).toContain(
      'complete subject line',
    );
  });

  it('uses generate_follow_up task policy without read/reply claims', () => {
    const builder = new MailPromptBuilder();
    const prompt = builder.build({ operation: 'generate_follow_up', context: context() });
    const system = prompt.sections.find((section) => section.id === 'SYSTEM_POLICY')?.content ?? '';
    const task = prompt.sections.find((section) => section.id === 'TASK')?.content ?? '';

    expect(system).toContain('Do not claim the recruiter read, opened, replied to, or ignored');
    expect(task).toContain('follow-up');
    expect(task).toContain('Do not claim the recruiter read, opened, or ignored');
  });
});
