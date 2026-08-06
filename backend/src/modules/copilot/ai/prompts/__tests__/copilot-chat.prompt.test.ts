import { describe, expect, it } from 'vitest';

import {
  buildCopilotChatUserPrompt,
  COPILOT_CHAT_SYSTEM_PROMPT,
  type CopilotPromptContext,
} from '@/modules/copilot/ai/prompts/copilot-chat.prompt.js';

describe('COPILOT_CHAT_SYSTEM_PROMPT', () => {
  it('defines a system prompt for the chat', () => {
    expect(COPILOT_CHAT_SYSTEM_PROMPT).toContain('You are Career Copilot');
    expect(COPILOT_CHAT_SYSTEM_PROMPT).toContain('Generate personalized cover letters.');
  });
});

describe('buildCopilotChatUserPrompt', () => {
  it('includes every context section when provided', () => {
    const input: CopilotPromptContext = {
      message: '  help me  ',
      page: 'dashboard',
      profileSummary: 'profile',
      resumeSummary: 'resume',
      jobSummary: 'job',
      applicationsSummary: 'apps',
      extraContext: 'extra',
    };

    const result = buildCopilotChatUserPrompt(input);

    expect(result).toContain('Current page: dashboard');
    expect(result).toContain('## User profile');
    expect(result).toContain('## Resume / candidate profile');
    expect(result).toContain('## Current job');
    expect(result).toContain('## Applications');
    expect(result).toContain('## Additional context');
    expect(result).toContain('## User message\nhelp me');
    expect(result).not.toContain('No structured profile or job context');
  });

  it('falls back to an unknown page and adds the empty-context note when nothing is provided', () => {
    const result = buildCopilotChatUserPrompt({ message: 'hello', page: '' });

    expect(result).toContain('Current page: unknown');
    expect(result).toContain(
      '(No structured profile or job context was available for this request.)',
    );
    expect(result).toContain('## User message\nhello');
  });

  it('omits empty context sections while still including provided ones', () => {
    const result = buildCopilotChatUserPrompt({
      message: 'hi',
      page: 'profile',
      resumeSummary: 'resume-only',
    });

    expect(result).toContain('## Resume / candidate profile');
    expect(result).not.toContain('## User profile');
    expect(result).not.toContain('## Current job');
    expect(result).not.toContain('## Applications');
    expect(result).not.toContain('## Additional context');
  });
});
