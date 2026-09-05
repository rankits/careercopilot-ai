export type JobSalaryFields = {
  minimum: number | null;
  maximum: number | null;
  currency: string | null;
};

const formatAmount = (value: number, currency: string): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (currency === 'INR') {
    return value.toLocaleString('en-IN');
  }

  return value.toLocaleString();
};

/**
 * Formats stored job salary for cards/detail in a way that matches the
 * job-feed salary filter language (`$50k` bands for USD, `LPA` for INR).
 */
export function formatJobSalary(salary: JobSalaryFields): string {
  const { minimum, maximum, currency } = salary;
  if (minimum == null && maximum == null) {
    return 'Not disclosed';
  }

  const code = currency?.trim().toUpperCase() ?? '';

  if (code === 'INR') {
    if (minimum != null && maximum != null) {
      return `₹${formatAmount(minimum, code)} - ${formatAmount(maximum, code)} LPA`;
    }
    const value = (minimum ?? maximum) as number;
    return `₹${formatAmount(value, code)} LPA`;
  }

  if (code === 'USD') {
    if (minimum != null && maximum != null) {
      return `${formatAmount(minimum, code)} - ${formatAmount(maximum, code)}`;
    }
    return formatAmount((minimum ?? maximum) as number, code);
  }

  if (minimum != null && maximum != null) {
    return code
      ? `${code} ${minimum.toLocaleString()} - ${maximum.toLocaleString()}`
      : `${minimum.toLocaleString()} - ${maximum.toLocaleString()}`;
  }

  const value = (minimum ?? maximum) as number;
  return code ? `${code} ${value.toLocaleString()}` : value.toLocaleString();
}
