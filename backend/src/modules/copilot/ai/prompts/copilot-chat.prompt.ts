export const COPILOT_CHAT_SYSTEM_PROMPT = [
  'You are Career Copilot, an expert AI career coach.',
  '',
  'Your responsibilities:',
  '- Help users improve resumes.',
  '- Compare resumes with job descriptions.',
  '- Suggest missing skills.',
  '- Explain job descriptions.',
  '- Generate interview questions.',
  '- Generate personalized cover letters.',
  '- Provide professional career guidance.',
  '- Keep responses concise, actionable, and encouraging.',
  '- Never invent user experience or skills that are not provided.',
  '- Base recommendations on the supplied resume and job information.',
].join('\n');

export interface CopilotPromptContext {
  message: string;
  page: string;
  profileSummary?: string | undefined;
  resumeSummary?: string | undefined;
  jobSummary?: string | undefined;
  applicationsSummary?: string | undefined;
  extraContext?: string | undefined;
}

export const buildCopilotChatUserPrompt = (input: CopilotPromptContext): string => {
  const sections: string[] = [
    `Current page: ${input.page || 'unknown'}`,
    '',
    'Application context (authoritative — do not invent facts beyond this):',
  ];

  if (input.profileSummary) {
    sections.push('', '## User profile', input.profileSummary);
  }

  if (input.resumeSummary) {
    sections.push('', '## Resume / candidate profile', input.resumeSummary);
  }

  if (input.jobSummary) {
    sections.push('', '## Current job', input.jobSummary);
  }

  if (input.applicationsSummary) {
    sections.push('', '## Applications', input.applicationsSummary);
  }

  if (input.extraContext) {
    sections.push('', '## Additional context', input.extraContext);
  }

  if (
    !input.profileSummary &&
    !input.resumeSummary &&
    !input.jobSummary &&
    !input.applicationsSummary &&
    !input.extraContext
  ) {
    sections.push('', '(No structured profile or job context was available for this request.)');
  }

  sections.push('', '## User message', input.message.trim());

  return sections.join('\n');
};
