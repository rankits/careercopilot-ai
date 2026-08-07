/**
 * Deterministic years-of-experience extraction for JD vs resume tenure checks.
 * Informational only — does not invent a hard Optimize block.
 */

export type YearsGapSeverity = 'ok' | 'minor_gap' | 'major_gap' | 'unknown';

const REQUIRED_YEARS_PATTERNS: RegExp[] = [
  /(\d+)\s*\+\s*years?(?:\s+of)?(?:\s+experience|\s+exp\.?)?/i,
  /(?:at\s+least|minimum(?:\s+of)?|min\.?)\s+(\d+)\s*\+?\s*years?/i,
  /(\d+)\s*[-–to]{1,3}\s*\d+\s*years?(?:\s+of)?(?:\s+experience)?/i,
  /(\d+)\s*years?(?:\s+of)?(?:\s+relevant)?(?:\s+professional)?(?:\s+experience|\s+exp\.?)/i,
  /experience\s*(?:of|:)?\s*(\d+)\s*\+?\s*years?/i,
];

const CANDIDATE_YEARS_PATTERNS: RegExp[] = [
  /(\d+)\s*\+?\s*years?(?:\s+of)?(?:\s+professional)?(?:\s+experience|\s+exp\.?)/i,
  /over\s+(\d+)\s*years?/i,
  /more\s+than\s+(\d+)\s*years?/i,
];

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const parseMonthYear = (raw: string): Date | null => {
  const cleaned = raw.trim().toLowerCase();
  if (/^(present|current|now|ongoing|till\s+date|to\s+date)$/i.test(cleaned)) {
    return new Date();
  }

  const monthYear = cleaned.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b[.\s,-]*((?:19|20)\d{2})\b/i,
  );
  if (monthYear) {
    const month = MONTH_MAP[monthYear[1]!.toLowerCase().slice(0, 3)] ?? 0;
    const year = Number(monthYear[2]);
    if (Number.isFinite(year)) return new Date(year, month, 1);
  }

  const yearOnly = cleaned.match(/\b((?:19|20)\d{2})\b/);
  if (yearOnly) {
    const year = Number(yearOnly[1]);
    if (Number.isFinite(year)) return new Date(year, 0, 1);
  }

  return null;
};

/** Extract the strongest "N+ years required" signal from a job description. */
export const extractRequiredYearsFromJd = (jd: string): number | null => {
  if (!jd?.trim()) return null;
  let best: number | null = null;
  for (const pattern of REQUIRED_YEARS_PATTERNS) {
    const match = jd.match(pattern);
    if (!match?.[1]) continue;
    const years = Number(match[1]);
    if (!Number.isFinite(years) || years <= 0 || years > 40) continue;
    best = best == null ? years : Math.max(best, years);
  }
  return best;
};

/**
 * Estimate candidate tenure from resume text.
 * Prefers an explicit "X years of experience" phrase; otherwise sums date ranges.
 */
export const estimateCandidateYears = (resumeText: string): number | null => {
  if (!resumeText?.trim()) return null;

  for (const pattern of CANDIDATE_YEARS_PATTERNS) {
    const match = resumeText.match(pattern);
    if (!match?.[1]) continue;
    const years = Number(match[1]);
    if (Number.isFinite(years) && years > 0 && years <= 50) return years;
  }

  const rangePattern =
    /\b((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|[12]\d{3})[^|\n]{0,24}?)\s*[-–—to]+\s*((?:present|current|now|ongoing|till\s+date|to\s+date|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|[12]\d{3})[^|\n]{0,16})/gi;

  let totalMonths = 0;
  let ranges = 0;
  for (const match of resumeText.matchAll(rangePattern)) {
    const start = parseMonthYear(match[1] ?? '');
    const end = parseMonthYear(match[2] ?? '');
    if (!start || !end) continue;
    const months = Math.max(
      0,
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()),
    );
    if (months <= 0 || months > 40 * 12) continue;
    totalMonths += months;
    ranges += 1;
  }

  if (ranges === 0) return null;
  // Cap overlapping double-count noise; still useful as a lower-bound signal.
  return Math.max(1, Math.round(Math.min(totalMonths, 40 * 12) / 12));
};

export const yearsGapSeverity = (
  required: number | null,
  actual: number | null,
): YearsGapSeverity => {
  if (required == null || actual == null) return 'unknown';
  if (actual >= required) return 'ok';
  const gap = required - actual;
  if (gap <= 2) return 'minor_gap';
  return 'major_gap';
};

export const yearsMatchScore = (required: number | null, actual: number | null): number => {
  const severity = yearsGapSeverity(required, actual);
  if (severity === 'ok') return 100;
  if (severity === 'minor_gap' && required != null && actual != null) {
    return Math.max(40, Math.round((actual / required) * 100));
  }
  if (severity === 'major_gap' && required != null && actual != null) {
    return Math.max(10, Math.round((actual / required) * 55));
  }
  return 70;
};

export const describeYearsGap = (required: number | null, actual: number | null): string | null => {
  const severity = yearsGapSeverity(required, actual);
  if (severity === 'unknown' || required == null) return null;
  if (severity === 'ok') return null;
  const shown = actual == null ? 'unclear tenure' : `~${actual} year${actual === 1 ? '' : 's'}`;
  return `JD requires ${required}+ years of experience; resume shows ${shown}.`;
};
