import { describe, expect, it } from 'vitest';

import { decodeDisplayText, decodeHtmlEntities } from '@/lib/decodeHtmlEntities';

describe('decodeHtmlEntities', () => {
  it('decodes common named entities', () => {
    expect(decodeHtmlEntities('AI Integration &amp; Automation')).toBe(
      'AI Integration & Automation',
    );
  });

  it('returns plain text unchanged', () => {
    expect(decodeHtmlEntities('Backend Engineer')).toBe('Backend Engineer');
  });
});

describe('decodeDisplayText', () => {
  it('handles empty values', () => {
    expect(decodeDisplayText(null)).toBe('');
    expect(decodeDisplayText('   ')).toBe('');
  });
});
