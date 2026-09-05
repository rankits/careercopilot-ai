export function decodeHtmlEntities(value: string): string {
  if (!/&lt;|&gt;|&amp;|&quot;|&#\d+;|&#x[0-9a-f]+;/i.test(value)) {
    return value;
  }

  if (typeof document === 'undefined') {
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

/** Decode HTML entities in display strings such as job titles. */
export function decodeDisplayText(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  return decodeHtmlEntities(trimmed);
}
