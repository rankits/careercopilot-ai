const COMPANY_SUFFIX_PATTERN =
  /\b(inc|incorporated|llc|ltd|limited|gmbh|corp|corporation|co|company|plc|ag|sa|srl|bv)\b\.?/gi;

/** Loose normalization for the AJA-DATA-003 fuzzy-duplicate warning only —
 * never used for a hard block. Strips legal-entity suffixes and punctuation
 * so "Acme Inc." and "ACME, Inc" compare equal without pulling in a
 * fuzzy-string-matching dependency for what is explicitly a warning-grade
 * signal, not a precision requirement. */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(COMPANY_SUFFIX_PATTERN, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TITLE_NOISE_PATTERN = /\([^)]*\)|\[[^\]]*]/g;

export function normalizeJobTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(TITLE_NOISE_PATTERN, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
