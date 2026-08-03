export interface CopilotChatContext {
  applications?: Array<{
    company?: string;
    status?: string;
    title?: string;
  }>;
  extra?: Record<string, unknown>;
  job?: {
    benefits?: string[];
    company?: string;
    description?: string;
    employmentType?: string;
    id?: string;
    location?: string;
    skills?: string[];
    title?: string;
  };
  jobId?: string;
  profile?: Record<string, unknown>;
  resume?: Record<string, unknown>;
}

export interface CopilotChatRequest {
  context: CopilotChatContext;
  message: string;
  page: string;
}

export interface CopilotChatResponse {
  reply: string;
}

export type CopilotMessageRole = 'assistant' | 'user';

export interface CopilotMessage {
  createdAt: string;
  error?: boolean;
  id: string;
  role: CopilotMessageRole;
  text: string;
}

export const COPILOT_WELCOME_MESSAGE =
  "Hi! I'm Career Copilot — your AI career coach. I already know your profile and the page you're on, so ask me anything about resumes, jobs, interviews, or career strategy.";

export const COPILOT_SUGGESTED_PROMPTS = [
  'Should I apply for this job?',
  'Review my resume',
  'Improve my resume summary',
  'Explain this job description',
  'Generate interview questions',
  'What skills am I missing?',
  'Generate a cover letter',
  'Give me career advice',
] as const;
