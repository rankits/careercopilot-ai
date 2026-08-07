/**
 * Builds the analysis corpus by combining stored job listing fields with
 * page-explored / headless snapshot text. Apply URLs (e.g. Ashby application
 * forms) often return thin form shells that would wipe a rich JD if used alone.
 */

export interface JobListingFieldsForAnalysis {
  readonly title: string;
  readonly companyName?: string | null;
  readonly companySlug?: string | null;
  readonly employmentType?: string | null;
  readonly remoteType?: string | null;
  readonly descriptionText?: string | null;
  readonly skills?: unknown;
  readonly tags?: unknown;
}

const MIN_SUBSTANTIAL_LENGTH = 80;
/** Page text below this is treated as a form/chrome shell, not a JD source. */
const MIN_PAGE_AS_PRIMARY_LENGTH = 400;

const asStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
};

/** Structured job listing signal — title, company, skills, and full JD text. */
export function buildJobListingCorpus(job: JobListingFieldsForAnalysis): string {
  const lines: string[] = [];
  const company = (job.companyName ?? job.companySlug ?? '').trim();
  if (job.title.trim()) {
    lines.push(company ? `${job.title.trim()} at ${company}` : job.title.trim());
  } else if (company) {
    lines.push(company);
  }
  if (job.employmentType?.trim()) lines.push(`Employment type: ${job.employmentType.trim()}`);
  if (job.remoteType?.trim()) lines.push(`Work mode: ${job.remoteType.trim()}`);

  const skills = asStringList(job.skills);
  if (skills.length > 0) lines.push(`Skills: ${skills.join(', ')}`);

  const tags = asStringList(job.tags);
  if (tags.length > 0) lines.push(`Tags: ${tags.join(', ')}`);

  const description = (job.descriptionText ?? '').trim();
  if (description) {
    if (lines.length > 0) lines.push('');
    lines.push(description);
  }

  return lines.join('\n').trim();
}

/**
 * Merge listing corpus with page-explored text.
 * - Never lets a thin application-form page replace a substantial JD.
 * - Keeps both signals when both are useful (sectioned for extractors).
 * - Dedupes when the page already contains the listing (or vice versa).
 */
export function mergeAnalysisCorpus(input: {
  readonly listingText: string;
  readonly pageText: string;
}): string {
  const listing = input.listingText.trim();
  const page = input.pageText.trim();

  if (!listing) return page;
  if (!page) return listing;

  // Page already embeds the listing (common when apply URL is the JD itself).
  if (page.includes(listing) || listing.includes(page)) {
    return page.length >= listing.length ? page : listing;
  }

  // Near-duplicate via normalized whitespace compare.
  const normalizedListing = listing.replace(/\s+/g, ' ').toLowerCase();
  const normalizedPage = page.replace(/\s+/g, ' ').toLowerCase();
  if (
    normalizedPage.includes(normalizedListing) ||
    normalizedListing.includes(normalizedPage)
  ) {
    return page.length >= listing.length ? page : listing;
  }

  const listingSubstantial = listing.length >= MIN_SUBSTANTIAL_LENGTH;
  const pageSubstantial = page.length >= MIN_PAGE_AS_PRIMARY_LENGTH;

  // Thin application-form / chrome shell — keep the listing as the primary
  // analysis text. Ashby (and similar) apply URLs often return form labels
  // without requirements; those must not wipe a rich JD.
  if (listingSubstantial && !pageSubstantial) {
    return listing;
  }

  // Page is shorter than ~35% of the listing: still treat as secondary chrome.
  if (listingSubstantial && page.length < listing.length * 0.35) {
    return listing;
  }

  if (listingSubstantial && pageSubstantial) {
    return `=== Job listing ===\n${listing}\n\n=== Application page ===\n${page}`;
  }

  // Prefer whichever is more substantial; fall back to concatenation.
  if (listingSubstantial) return listing;
  if (pageSubstantial) return page;
  return `${listing}\n\n${page}`.trim();
}
