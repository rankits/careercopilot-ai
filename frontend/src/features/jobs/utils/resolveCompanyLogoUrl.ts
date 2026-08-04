const CORPORATE_SUFFIX =
  /\b(inc|incorporated|llc|ltd|limited|corp|corporation|company|co|gmbh|ag|plc|group|technologies|technology|tech|labs|lab|software|systems|solutions|services)\b/gi;

/** Best-effort domain guess from company slug or name (e.g. "Microsoft" → microsoft.com). */
export function guessCompanyDomain(slug?: string | null, name?: string | null): string | null {
  const source = (slug?.trim() || name?.trim() || '').toLowerCase();
  if (!source) return null;

  const cleaned = source
    .replace(CORPORATE_SUFFIX, ' ')
    .replace(/[^a-z0-9]+/g, '')
    .trim();

  if (cleaned.length < 2) return null;
  return `${cleaned}.com`;
}

/**
 * Prefer a stored logo URL; otherwise fall back to a favicon guessed from the company domain.
 * Callers should keep a letter/initial fallback when the image fails to load.
 */
export function resolveCompanyLogoUrl(options: {
  logoUrl?: string | null;
  companySlug?: string | null;
  companyName?: string | null;
}): string | undefined {
  const stored = options.logoUrl?.trim();
  if (stored) return stored;

  const domain = guessCompanyDomain(options.companySlug, options.companyName);
  if (!domain) return undefined;

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}
