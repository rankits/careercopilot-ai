/**
 * Returns an http(s) apply URL or null. Non-http schemes (javascript:, data:, etc.) are rejected.
 */
export function toSafeApplyUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Pick the first safe apply URL from sources already ordered by priority desc. */
export function pickPrimaryApplyUrl(
  sources: ReadonlyArray<{ applyUrl: string | null | undefined }>,
): string | null {
  for (const source of sources) {
    const safe = toSafeApplyUrl(source.applyUrl);
    if (safe) return safe;
  }
  return null;
}
