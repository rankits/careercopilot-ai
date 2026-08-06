import { describe, expect, it } from 'vitest';

import {
  average,
  buildWeeklySparkline,
  countCreatedThisWeek,
  formatCount,
  formatMatchScore,
  formatWeeklyDelta,
  getTimeGreeting,
  resolveDashboardFirstName,
} from './dashboardMetrics';

describe('dashboardMetrics utils', () => {
  it('resolves greeting by time of day', () => {
    expect(getTimeGreeting(new Date('2026-08-05T09:00:00'))).toBe('Good morning');
    expect(getTimeGreeting(new Date('2026-08-05T14:00:00'))).toBe('Good afternoon');
    expect(getTimeGreeting(new Date('2026-08-05T20:00:00'))).toBe('Good evening');
  });

  it('resolves first name with fallbacks', () => {
    expect(resolveDashboardFirstName({ firstName: 'Raj', name: 'Raj Patel' })).toBe('Raj');
    expect(resolveDashboardFirstName({ name: 'Ada Lovelace' })).toBe('Ada');
    expect(resolveDashboardFirstName({ email: 'dev@example.com' })).toBe('dev');
    expect(resolveDashboardFirstName(null)).toBe('there');
  });

  it('counts and buckets weekly timestamps', () => {
    const now = Date.parse('2026-08-05T12:00:00.000Z');
    const recent = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(countCreatedThisWeek([recent, '2020-01-01'], now)).toBe(1);
    expect(buildWeeklySparkline([recent], now).some((value) => value > 0)).toBe(true);
  });

  it('formats helpers', () => {
    expect(formatWeeklyDelta(3)).toBe('+3 this week');
    expect(formatWeeklyDelta(0)).toBe('No change this week');
    expect(formatMatchScore(91.2)).toBe('91%');
    expect(formatMatchScore(null)).toBe('—');
    expect(formatCount(2480)).toBe('2,480');
    expect(average([90, 80])).toBe(85);
    expect(average([])).toBeNull();
  });
});
