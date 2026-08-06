import { describe, expect, it } from 'vitest';

import {
  convertUsdAmountToCurrency,
  expandUsdSalaryBand,
} from '@/modules/job-listing/utils/salary-currency-conversion.js';

describe('salary-currency-conversion', () => {
  it('converts USD annual amounts into absolute foreign currency', () => {
    expect(convertUsdAmountToCurrency(50_000, 'EUR')).toBe(46_000);
    expect(convertUsdAmountToCurrency(50_000, 'USD')).toBe(50_000);
  });

  it('converts USD annual amounts into INR LPA', () => {
    // 50000 * 83 / 100000 = 41.5 LPA
    expect(convertUsdAmountToCurrency(50_000, 'INR')).toBe(41.5);
  });

  it('expands a USD band across supported currencies', () => {
    const bands = expandUsdSalaryBand({ minSalary: 50_000, maxSalary: 100_000 });
    expect(bands).toEqual(
      expect.arrayContaining([
        { currency: 'USD', minSalary: 50_000, maxSalary: 100_000 },
        { currency: 'EUR', minSalary: 46_000, maxSalary: 92_000 },
        { currency: 'INR', minSalary: 41.5, maxSalary: 83 },
      ]),
    );
  });
});
