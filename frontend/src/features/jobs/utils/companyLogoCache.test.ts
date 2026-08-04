import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getCompanyLogoCacheStatus,
  loadCompanyLogo,
  markCompanyLogoFailed,
  resetCompanyLogoCache,
} from './companyLogoCache';

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';

  static failNext = false;
  static created = 0;

  constructor() {
    MockImage.created += 1;
    queueMicrotask(() => {
      if (MockImage.failNext) {
        MockImage.failNext = false;
        this.onerror?.();
        return;
      }
      this.onload?.();
    });
  }
}

describe('companyLogoCache', () => {
  afterEach(() => {
    resetCompanyLogoCache();
    MockImage.created = 0;
    MockImage.failNext = false;
    vi.unstubAllGlobals();
  });

  it('loads a logo once and reuses the cached success for later callers', async () => {
    vi.stubGlobal('Image', MockImage);

    const first = await loadCompanyLogo('https://cdn.example/acme.png');
    const second = await loadCompanyLogo('https://cdn.example/acme.png');

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(MockImage.created).toBe(1);
    expect(getCompanyLogoCacheStatus('https://cdn.example/acme.png')).toBe('ready');
  });

  it('dedupes in-flight requests for the same URL', async () => {
    vi.stubGlobal('Image', MockImage);

    const [a, b] = await Promise.all([
      loadCompanyLogo('https://cdn.example/beta.png'),
      loadCompanyLogo('https://cdn.example/beta.png'),
    ]);

    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(MockImage.created).toBe(1);
  });

  it('caches failures so the URL is not retried', async () => {
    vi.stubGlobal('Image', MockImage);
    MockImage.failNext = true;

    const first = await loadCompanyLogo('https://cdn.example/missing.png');
    const second = await loadCompanyLogo('https://cdn.example/missing.png');

    expect(first).toBe(false);
    expect(second).toBe(false);
    expect(MockImage.created).toBe(1);
    expect(getCompanyLogoCacheStatus('https://cdn.example/missing.png')).toBe('error');
  });

  it('marks a previously ready logo as failed when the image errors at render time', async () => {
    vi.stubGlobal('Image', MockImage);

    await loadCompanyLogo('https://cdn.example/broken.png');
    expect(getCompanyLogoCacheStatus('https://cdn.example/broken.png')).toBe('ready');

    markCompanyLogoFailed('https://cdn.example/broken.png');
    expect(getCompanyLogoCacheStatus('https://cdn.example/broken.png')).toBe('error');
    expect(await loadCompanyLogo('https://cdn.example/broken.png')).toBe(false);
    expect(MockImage.created).toBe(1);
  });
});
