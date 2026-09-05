import { DASHBOARD_LIMITS } from '@/constants/pages/dashboard';
import { toTitleCase } from '@/lib/toTitleCase';

export function getTimeGreeting(
  now = new Date(),
): 'Good morning' | 'Good afternoon' | 'Good evening' {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function resolveDashboardFirstName(
  user: {
    email?: string;
    firstName?: string;
    name?: string;
  } | null,
): string {
  const first = user?.firstName?.trim();
  if (first) return toTitleCase(first);

  const fromName = user?.name?.trim().split(/\s+/)[0];
  if (fromName) return toTitleCase(fromName);

  const emailPrefix = user?.email?.split('@')[0]?.trim();
  if (emailPrefix) return toTitleCase(emailPrefix);

  return 'there';
}

export function countCreatedThisWeek(
  dates: Array<string | null | undefined>,
  now = Date.now(),
): number {
  const cutoff = now - DASHBOARD_LIMITS.weekMs;
  return dates.reduce((count, value) => {
    if (!value) return count;
    const time = new Date(value).getTime();
    if (Number.isNaN(time) || time < cutoff) return count;
    return count + 1;
  }, 0);
}

/** Build a 7-bucket sparkline from timestamps (oldest → newest). */
export function buildWeeklySparkline(
  dates: Array<string | null | undefined>,
  now = Date.now(),
): number[] {
  const buckets = Array.from({ length: DASHBOARD_LIMITS.sparklinePoints }, () => 0);
  const dayMs = DASHBOARD_LIMITS.weekMs / DASHBOARD_LIMITS.sparklinePoints;

  for (const value of dates) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) continue;
    const age = now - time;
    if (age < 0 || age > DASHBOARD_LIMITS.weekMs) continue;
    const index = Math.min(
      DASHBOARD_LIMITS.sparklinePoints - 1,
      Math.floor((DASHBOARD_LIMITS.weekMs - age) / dayMs),
    );
    const current = buckets[index] ?? 0;
    buckets[index] = current + 1;
  }

  return buckets;
}

export function formatWeeklyDelta(count: number): string {
  if (count > 0) return `+${count} this week`;
  if (count < 0) return `${count} this week`;
  return 'No change this week';
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatMatchScore(score: number | null): string {
  if (score === null) return '—';
  return `${Math.round(score)}%`;
}

export function resumeScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'Fair';
  return 'Needs work';
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
