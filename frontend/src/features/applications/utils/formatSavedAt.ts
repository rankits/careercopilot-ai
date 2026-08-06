const DAY_MS = 1000 * 60 * 60 * 24;

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

/** Human-friendly relative label for when a job was saved. */
export function formatSavedAt(createdAt: string | null | undefined): string {
  if (!createdAt) return 'Saved recently';

  const saved = new Date(createdAt);
  if (Number.isNaN(saved.getTime())) return 'Saved recently';

  const days = Math.max(0, Math.floor((Date.now() - saved.getTime()) / DAY_MS));

  if (days === 0) return 'Saved today';
  if (days < 30) return `Saved ${pluralize(days, 'day')} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `Saved ${pluralize(months, 'month')} ago`;

  const years = Math.floor(days / 365);
  return `Saved ${pluralize(Math.max(1, years), 'year')} ago`;
}
