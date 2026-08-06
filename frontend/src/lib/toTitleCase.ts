/** Convert a display name to Title Case (e.g. "pankaj saini" → "Pankaj Saini"). */
export function toTitleCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
