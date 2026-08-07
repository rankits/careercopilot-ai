export type VacancyEmailConfidence = 'HIGH' | 'LOW';

export interface VacancyEmailCandidate {
  email: string;
  confidence: VacancyEmailConfidence;
  context: string;
}

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const HIGH_CONFIDENCE_LOCAL_PARTS = [
  'careers',
  'career',
  'jobs',
  'job',
  'recruitment',
  'recruiting',
  'recruiter',
  'hr',
  'talent',
  'apply',
  'hiring',
];

function extractContext(text: string, email: string, radius = 60): string {
  const index = text.indexOf(email);
  if (index === -1) return '';
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + email.length + radius);
  return text.slice(start, end).trim();
}

/**
 * Implements AJA-EMAIL-002's discovery half — extracts only email
 * addresses the employer explicitly published in the job's own
 * description text. Never guesses an address from a company domain
 * pattern (e.g. firstname.lastname@company.com) and never looks anywhere
 * outside the vacancy text itself — per the design doc's "only send to an
 * email explicitly associated with the vacancy... never guess addresses."
 */
export function extractVacancyEmailCandidates(descriptionText: string): VacancyEmailCandidate[] {
  const matches = descriptionText.match(EMAIL_PATTERN) ?? [];
  const seen = new Set<string>();
  const candidates: VacancyEmailCandidate[] = [];

  for (const rawMatch of matches) {
    const email = rawMatch.toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);

    const localPart = email.split('@')[0] ?? '';
    const confidence: VacancyEmailConfidence = HIGH_CONFIDENCE_LOCAL_PARTS.some((keyword) =>
      localPart.includes(keyword),
    )
      ? 'HIGH'
      : 'LOW';

    candidates.push({ email, confidence, context: extractContext(descriptionText, rawMatch) });
  }

  return candidates.sort((a, b) =>
    a.confidence === b.confidence ? 0 : a.confidence === 'HIGH' ? -1 : 1,
  );
}
