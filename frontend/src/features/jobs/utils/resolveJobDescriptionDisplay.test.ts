import { describe, expect, it } from 'vitest';

import { looksLikeHtml, resolveJobDescriptionDisplay } from './resolveJobDescriptionDisplay';

describe('resolveJobDescriptionDisplay', () => {
  it('renders HTML from descriptionHtml when markup is present', () => {
    const result = resolveJobDescriptionDisplay({
      descriptionHtml: '<p>Build APIs</p>',
      descriptionText: 'Build APIs',
      remainingDescription: 'Build APIs',
    });

    expect(result).toEqual({ mode: 'html', content: '<p>Build APIs</p>' });
  });

  it('renders HTML from descriptionText when descriptionHtml is empty', () => {
    const html = '<div class="content-intro"><h2>Join us</h2><p>Mission</p></div>';
    const result = resolveJobDescriptionDisplay({
      descriptionHtml: '',
      descriptionText: html,
      remainingDescription: html,
    });

    expect(result.mode).toBe('html');
    expect(result.content).toContain('<h2>Join us</h2>');
  });

  it('treats plain prose in descriptionHtml as text', () => {
    const prose = 'We are searching for a professional Marketeer.';
    const result = resolveJobDescriptionDisplay({
      descriptionHtml: prose,
      descriptionText: prose,
      remainingDescription: prose,
    });

    expect(result).toEqual({ mode: 'text', content: prose });
  });

  it('prefers remainingDescription for plain text after section extraction', () => {
    const result = resolveJobDescriptionDisplay({
      descriptionHtml: '',
      descriptionText: 'Intro only.',
      remainingDescription: 'Intro only.',
    });

    expect(result).toEqual({ mode: 'text', content: 'Intro only.' });
  });

  it('decodes escaped HTML before detecting markup', () => {
    const result = resolveJobDescriptionDisplay({
      descriptionHtml: '&lt;p&gt;Hello&lt;/p&gt;',
      descriptionText: '',
      remainingDescription: '',
    });

    expect(result.mode).toBe('html');
    expect(result.content).toBe('<p>Hello</p>');
  });

  it('returns fallback copy when no description is available', () => {
    expect(
      resolveJobDescriptionDisplay({
        descriptionHtml: '',
        descriptionText: '',
        remainingDescription: '',
      }),
    ).toEqual({ mode: 'text', content: 'No description provided.' });
  });
});

describe('looksLikeHtml', () => {
  it('detects common HTML tags', () => {
    expect(looksLikeHtml('<p>Hello</p>')).toBe(true);
    expect(looksLikeHtml('Plain text only.')).toBe(false);
  });
});
