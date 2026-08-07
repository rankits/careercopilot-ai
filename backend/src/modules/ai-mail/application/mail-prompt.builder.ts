import type { MailPromptDocument } from '@/modules/ai-mail/contracts/mail-generation-provider.contract.js';
import {
  AI_MAIL_PROMPT_VERSION,
  AI_MAIL_SYSTEM_POLICY,
  AI_MAIL_TASK_BY_OPERATION,
} from '@/modules/ai-mail/domain/mail-prompt-policy.js';
import type {
  MailGenerationContext,
  MailGenerationOperation,
} from '@/modules/ai-mail/domain/ai-mail.types.js';

const serialize = (value: unknown): string => JSON.stringify(value, null, 2);

const taskFor = (
  operation: MailGenerationOperation,
  selectedText?: string,
  rewriteInstruction?: MailGenerationProviderRequestExtras['rewriteInstruction'],
): string => {
  const base = AI_MAIL_TASK_BY_OPERATION[operation];
  const extras: string[] = [];
  if (selectedText?.trim()) extras.push(`Selected text:\n${selectedText.trim()}`);
  if (rewriteInstruction?.tone) extras.push(`Requested tone: ${rewriteInstruction.tone}`);
  if (rewriteInstruction?.maximumWords) {
    extras.push(`Maximum words: ${rewriteInstruction.maximumWords}`);
  }
  if (rewriteInstruction?.instruction?.trim()) {
    extras.push(`Rewrite instruction: ${rewriteInstruction.instruction.trim()}`);
  }
  return extras.length > 0 ? `${base}\n\n${extras.join('\n')}` : base;
};

export interface MailGenerationProviderRequestExtras {
  rewriteInstruction?: {
    tone?: string;
    maximumWords?: number;
    instruction?: string;
  };
}

export class MailPromptBuilder {
  build(input: {
    operation: MailGenerationOperation;
    context: MailGenerationContext;
    selectedText?: string;
    rewriteInstruction?: MailGenerationProviderRequestExtras['rewriteInstruction'];
    promptVersion?: string;
  }): MailPromptDocument {
    const version = input.promptVersion ?? AI_MAIL_PROMPT_VERSION;
    const { candidate, constraints, job, resume } = input.context;

    return {
      version,
      sections: [
        { id: 'SYSTEM_POLICY', content: AI_MAIL_SYSTEM_POLICY },
        { id: 'USER_CONSTRAINTS', content: serialize(constraints) },
        { id: 'CANDIDATE_PROFILE_DATA', content: serialize(candidate) },
        { id: 'SELECTED_RESUME_DATA', content: serialize(resume) },
        {
          id: 'JOB_DESCRIPTION_DATA',
          content: serialize({
            description: job.description,
            recruiterEmail: job.recruiterEmail,
            recruiterName: job.recruiterName,
            companyName: job.companyName,
            roleTitle: job.roleTitle,
            jobUrl: job.jobUrl,
            additionalContext: job.additionalContext,
            responsibilities: job.responsibilities,
            requirements: job.requirements,
            preferredQualifications: job.preferredQualifications,
            technologies: job.technologies,
            keywords: job.keywords,
          }),
        },
        {
          id: 'TASK',
          content: taskFor(input.operation, input.selectedText, input.rewriteInstruction),
        },
      ],
    };
  }
}
