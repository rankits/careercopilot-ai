type CacheEntry =
  { status: 'ready' } | { status: 'error' } | { status: 'loading'; promise: Promise<boolean> };

const cache = new Map<string, CacheEntry>();

/** Session cache: each logo URL is loaded once and reused for later job cards. */
export function loadCompanyLogo(url: string): Promise<boolean> {
  const existing = cache.get(url);
  if (existing?.status === 'ready') return Promise.resolve(true);
  if (existing?.status === 'error') return Promise.resolve(false);
  if (existing?.status === 'loading') return existing.promise;

  const promise = new Promise<boolean>((resolve) => {
    const image = new Image();
    image.onload = () => {
      cache.set(url, { status: 'ready' });
      resolve(true);
    };
    image.onerror = () => {
      cache.set(url, { status: 'error' });
      resolve(false);
    };
    image.src = url;
  });

  cache.set(url, { status: 'loading', promise });
  return promise;
}

/** Mark a logo URL as failed so later cards show the company initial instead. */
export function markCompanyLogoFailed(url: string): void {
  cache.set(url, { status: 'error' });
}

export function getCompanyLogoCacheStatus(url: string): 'ready' | 'error' | 'loading' | 'miss' {
  const entry = cache.get(url);
  if (!entry) return 'miss';
  return entry.status;
}

/** @internal test helper */
export function resetCompanyLogoCache(): void {
  cache.clear();
}
