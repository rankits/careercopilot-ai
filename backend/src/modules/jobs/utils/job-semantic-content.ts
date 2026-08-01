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

export const normalizeJobSemanticContent = (content: JobSemanticContent) => ({
  companySlug: content.companySlug.trim().toLowerCase(),
  companyName: content.companyName.trim().toLowerCase(),
  title: content.title.trim().toLowerCase(),
  descriptionText: content.descriptionText.trim(),
  remoteType: content.remoteType,
  skills: normalizeStringArray(content.skills),
  tags: normalizeStringArray(content.tags),
  employmentType: content.employmentType,
});

export const serializeJobSemanticContent = (content: JobSemanticContent): string =>
  JSON.stringify(normalizeJobSemanticContent(content));
