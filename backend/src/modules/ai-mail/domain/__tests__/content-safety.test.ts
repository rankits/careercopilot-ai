import { describe, expect, it } from 'vitest';

import { hashAiMailContent } from '@/modules/ai-mail/domain/content-hasher.js';
import {
  findUnresolvedPlaceholders,
  hasUnresolvedPlaceholders,
} from '@/modules/ai-mail/domain/placeholder-detector.js';

const content = {
  recruiterEmail: 'Recruiter@Example.com ',
  subject: ' Application ',
  bodyText: 'Hello\r\nWorld',
  bodyHtml: 'Hello\r\nWorld',
  resumeId: '11111111-1111-4111-8111-111111111111',
  version: 2,
};

describe('AI Mail content safety utilities', () => {
  it('detects common unresolved placeholder forms', () => {
    expect(findUnresolvedPlaceholders('Hello {{ recruiter }}', 'At [Company Name]')).toEqual([
      '{{ recruiter }}',
      '[Company Name]',
    ]);
    expect(hasUnresolvedPlaceholders('Hello Jane', 'Complete body')).toBe(false);
  });

  it('hashes canonical content deterministically and includes version', () => {
    const first = hashAiMailContent(content);
    expect(first).toHaveLength(64);
    expect(
      hashAiMailContent({
        ...content,
        recruiterEmail: 'recruiter@example.com',
        subject: 'Application',
        bodyText: 'Hello\nWorld',
      }),
    ).toBe(first);
    expect(hashAiMailContent({ ...content, version: 3 })).not.toBe(first);
  });
});
