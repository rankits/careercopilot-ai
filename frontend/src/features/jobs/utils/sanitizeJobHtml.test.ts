import { describe, expect, it } from 'vitest';

import { sanitizeJobHtml } from './sanitizeJobHtml';

describe('sanitizeJobHtml', () => {
  it('strips script tags and inline handlers', () => {
    const dirty =
      '<p onclick="alert(1)">Hello</p><script>alert(2)</script><a href="javascript:evil()">x</a>';
    const clean = sanitizeJobHtml(dirty);
    expect(clean).not.toMatch(/script/i);
    expect(clean).not.toMatch(/onclick/i);
    expect(clean).not.toMatch(/javascript:/i);
    expect(clean).toMatch(/Hello/);
  });
});
