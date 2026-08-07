/**
 * Approximate FX rates used to expand USD salary-band filters across currencies.
 * Amounts are treated as annual totals, except INR which is stored/displayed as LPA.
 */

/** Units of foreign currency per 1 USD (approx.). */
export const USD_FX_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83,
  AUD: 1.52,
  CAD: 1.36,
  SGD: 1.34,
  SEK: 10.5,
};

const INR_PER_LPA = 100_000;

export interface UsdSalaryBand {
  minSalary?: number;
  maxSalary?: number;
}

export interface CurrencySalaryBand extends UsdSalaryBand {
  currency: string;
}

/** Convert a USD annual amount into the unit stored for that currency. */
export function convertUsdAmountToCurrency(amountUsd: number, currency: string): number {
  const code = currency.toUpperCase();
  const rate = USD_FX_RATES[code];
  if (rate == null) {
    return amountUsd;
  }

  const absolute = amountUsd * rate;
  if (code === 'INR') {
    return absolute / INR_PER_LPA;
  }

  return absolute;
}

/** Expand a USD salary band into per-currency bands for multi-currency matching. */
export function expandUsdSalaryBand(band: UsdSalaryBand): CurrencySalaryBand[] {
  return Object.keys(USD_FX_RATES).map((currency) => ({
    currency,
    minSalary:
      band.minSalary === undefined
        ? undefined
        : roundSalaryBound(convertUsdAmountToCurrency(band.minSalary, currency)),
    maxSalary:
      band.maxSalary === undefined
        ? undefined
        : roundSalaryBound(convertUsdAmountToCurrency(band.maxSalary, currency)),
  }));
}

function roundSalaryBound(value: number): number {
  if (value >= 1000) {
    return Math.round(value);
  }
  // Keep fractional LPA precision for INR-style small numbers.
  return Math.round(value * 100) / 100;
}
