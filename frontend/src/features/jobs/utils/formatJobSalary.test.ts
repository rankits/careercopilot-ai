import { describe, expect, it } from 'vitest';

import { formatJobSalary } from './formatJobSalary';

describe('formatJobSalary', () => {
  it('formats USD salaries with dollar signs to match feed filter labels', () => {
    expect(formatJobSalary({ minimum: 100000, maximum: 140000, currency: 'USD' })).toBe(
      '$100,000 - $140,000',
    );
  });

  it('formats INR salaries as rupee LPA amounts', () => {
    expect(formatJobSalary({ minimum: 18, maximum: 28, currency: 'INR' })).toBe('₹18 - 28 LPA');
  });

  it('returns Not disclosed when no amounts exist', () => {
    expect(formatJobSalary({ minimum: null, maximum: null, currency: 'USD' })).toBe(
      'Not disclosed',
    );
  });
});
