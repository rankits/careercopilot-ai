const DAY_MS = 1000 * 60 * 60 * 24;

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

/** Human-friendly relative posted label (days / months / years). */
export function formatPostedAt(publishedAt: string | null | undefined): string {
  if (!publishedAt) return 'Posted recently';

  const posted = new Date(publishedAt);
  if (Number.isNaN(posted.getTime())) return 'Posted recently';

  const days = Math.max(0, Math.floor((Date.now() - posted.getTime()) / DAY_MS));

  if (days === 0) return 'Posted today';
  if (days < 30) return `Posted ${pluralize(days, 'day')} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `Posted ${pluralize(months, 'month')} ago`;

  const years = Math.floor(days / 365);
  return `Posted ${pluralize(Math.max(1, years), 'year')} ago`;
}
