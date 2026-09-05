export interface JobSemanticContent {
  readonly companySlug: string;
  readonly companyName: string;
  readonly title: string;
  readonly descriptionText: string;
  readonly remoteType: string | null;
  readonly skills: unknown;
  readonly tags: unknown;
  readonly employmentType: string | null;
}

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().toLowerCase())
        .sort()
    : [];

export const stripHtmlNoise = (text: string): string =>
  text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeJobSemanticContent = (content: JobSemanticContent) => ({
  companySlug: content.companySlug.trim().toLowerCase(),
  companyName: content.companyName.trim().toLowerCase(),
  title: content.title.trim().toLowerCase(),
  descriptionText: stripHtmlNoise(content.descriptionText),
  remoteType: content.remoteType,
  skills: normalizeStringArray(content.skills),
  tags: normalizeStringArray(content.tags),
  employmentType: content.employmentType,
});

export const serializeJobSemanticContent = (content: JobSemanticContent): string =>
  JSON.stringify(normalizeJobSemanticContent(content));
