import { describe, expect, it } from 'vitest';

import { MailOutputParser } from '@/modules/ai-mail/application/mail-output.parser.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

describe('MailOutputParser', () => {
  const parser = new MailOutputParser();

  it('parses valid provider output', () => {
    const output = parser.parse({
      subject: 'Application for Backend Engineer',
      bodyText: 'Hello,\n\nI am interested in the role.',
      detectedContext: { roleTitle: 'Backend Engineer' },
      highlightedQualifications: [{ claim: 'TypeScript', evidenceCategory: 'skill' }],
      warnings: [],
    });

    expect(output.highlightedQualifications).toEqual([
      { claim: 'TypeScript', evidenceCategory: 'skill' },
    ]);
  });

  it('throws AI_MAIL_OUTPUT_INVALID for malformed output', () => {
    expect(() => parser.parse({ subject: '', bodyText: 'Body' })).toThrowError(AppError);
    try {
      parser.parse({ subject: '', bodyText: 'Body' });
    } catch (error) {
      expect(error).toMatchObject({ code: 'AI_MAIL_OUTPUT_INVALID' });
    }
  });
});
