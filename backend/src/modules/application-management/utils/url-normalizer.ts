const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
  'ref',
  'source',
]);

export function normalizeJobUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url.trim());
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove tracking query parameters
    const paramsToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        paramsToDelete.push(key);
      }
    });
    for (const key of paramsToDelete) {
      parsed.searchParams.delete(key);
    }

    // Remove trailing slash from pathname (unless root "/")
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    return parsed.toString();
  } catch {
    return url.trim();
  }
}
