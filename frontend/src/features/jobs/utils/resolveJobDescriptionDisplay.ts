import { decodeHtmlEntities } from '@/lib/decodeHtmlEntities';

export type JobDescriptionDisplayMode = 'html' | 'text';

export interface JobDescriptionDisplay {
  content: string;
  mode: JobDescriptionDisplayMode;
}

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*?>/i;

export function looksLikeHtml(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return HTML_TAG_PATTERN.test(trimmed);
}

function normalizeContent(value: string): string {
  return decodeHtmlEntities(value.trim());
}

function asHtmlContent(value: string): JobDescriptionDisplay {
  return { mode: 'html', content: normalizeContent(value) };
}

function asTextContent(value: string): JobDescriptionDisplay {
  return { mode: 'text', content: value.trim() };
}

/**
 * Pick the best description source and whether it should render as HTML or plain text.
 */
export function resolveJobDescriptionDisplay(input: {
  descriptionHtml?: string | null;
  descriptionText?: string | null;
  remainingDescription?: string | null;
}): JobDescriptionDisplay {
  const htmlField = input.descriptionHtml?.trim() ?? '';
  const textField = input.descriptionText?.trim() ?? '';
  const remaining = input.remainingDescription?.trim() ?? '';

  const candidates = [htmlField, textField, remaining].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeContent(candidate);
    if (looksLikeHtml(normalized)) {
      return asHtmlContent(normalized);
    }
  }

  if (remaining) return asTextContent(remaining);
  if (htmlField) return asTextContent(htmlField);
  if (textField) return asTextContent(textField);

  return asTextContent('No description provided.');
}
