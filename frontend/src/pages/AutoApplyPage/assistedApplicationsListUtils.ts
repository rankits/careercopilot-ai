/** Relative time for Assisted applications list rows (AA-080). */
export function formatListRelativeTime(isoOrDate: string | Date, now = new Date()): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = date.getTime() - now.getTime();
  const absSec = Math.round(Math.abs(diffMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), 'second');
  const absMin = Math.round(absSec / 60);
  if (absMin < 60) return rtf.format(Math.round(diffMs / 60_000), 'minute');
  const absHr = Math.round(absMin / 60);
  if (absHr < 48) return rtf.format(Math.round(diffMs / 3_600_000), 'hour');
  const absDay = Math.round(absHr / 24);
  if (absDay < 30) return rtf.format(Math.round(diffMs / 86_400_000), 'day');
  const absMonth = Math.round(absDay / 30);
  if (absMonth < 12) return rtf.format(Math.round(diffMs / 2_592_000_000), 'month');
  return rtf.format(Math.round(diffMs / 31_536_000_000), 'year');
}
