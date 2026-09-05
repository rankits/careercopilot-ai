/**
 * Returns an http(s) apply URL or null. Rejects javascript:, data:, and other schemes.
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

/**
 * Opens a validated apply URL in a new tab with noopener/noreferrer.
 * Returns false when the URL is missing/unsafe or the popup is blocked.
 */
export function openExternalApply(raw: string | null | undefined): boolean {
  const safeUrl = toSafeApplyUrl(raw);
  if (!safeUrl) return false;

  const opened = window.open(safeUrl, '_blank', 'noopener,noreferrer');
  if (opened) {
    opened.opener = null;
  }
  return opened != null;
}
