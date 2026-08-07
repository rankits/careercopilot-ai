import type { ApplicationProvider } from '@/modules/auto-apply/types/application-page-analysis.types.js';

export function detectApplicationProvider(url: string): ApplicationProvider {
  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return 'UNKNOWN';
  }

  if (hostname === 'jobs.ashbyhq.com' || hostname.endsWith('.ashbyhq.com')) return 'ASHBY';
  if (hostname.includes('greenhouse.io') || hostname.includes('boards.greenhouse')) {
    return 'GREENHOUSE';
  }
  if (hostname.includes('lever.co') || hostname.includes('jobs.lever.co')) return 'LEVER';
  if (hostname.includes('myworkdayjobs.com') || hostname.includes('workday.com')) return 'WORKDAY';
  return 'UNKNOWN';
}

/** Ashby (and similar) detection never implies authorized API submission. */
export function submissionCapabilityForProvider(
  provider: ApplicationProvider,
): 'EXTERNAL_MANUAL' | 'UNSUPPORTED' {
  if (provider === 'UNKNOWN') return 'UNSUPPORTED';
  return 'EXTERNAL_MANUAL';
}
