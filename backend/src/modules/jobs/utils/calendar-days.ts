/** Subtract whole UTC days from a date (preserves time-of-day). */
export function subtractDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}
