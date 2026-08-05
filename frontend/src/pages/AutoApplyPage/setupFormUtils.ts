/** ISO 3166-1 alpha-2 codes for the personal-details country select. */
export const COUNTRY_OPTIONS: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'IN', label: 'India' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'AU', label: 'Australia' },
  { code: 'SG', label: 'Singapore' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'JP', label: 'Japan' },
  { code: 'CH', label: 'Switzerland' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'IE', label: 'Ireland' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'MX', label: 'Mexico' },
  { code: 'BR', label: 'Brazil' },
];

const E164_PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;

export function isValidE164Phone(value: string): boolean {
  if (!value.trim()) return true;
  return E164_PHONE_PATTERN.test(value.trim());
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

export function joinFullName(firstName?: string | null, lastName?: string | null): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

export function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const WORK_AUTHORIZATION_OPTIONS = [
  {
    value: 'AUTHORIZED_NO_SPONSORSHIP',
    label: (countryLabel: string) =>
      `Authorized to work in ${countryLabel} without sponsorship`,
  },
  {
    value: 'NEEDS_SPONSORSHIP',
    label: () => 'Will need visa sponsorship now or in the future',
  },
  {
    value: 'PREFER_NOT_TO_ANSWER',
    label: () => 'Prefer not to answer',
  },
] as const;

export type SponsorshipChoice = 'yes' | 'no' | 'unknown';

export function sponsorshipChoiceFromProfile(
  requiresSponsorship: boolean | undefined,
): SponsorshipChoice {
  if (requiresSponsorship === true) return 'yes';
  if (requiresSponsorship === false) return 'no';
  return 'unknown';
}

export const BASELINE_ANSWER_FIELDS = [
  {
    key: 'years_of_experience',
    label: 'How many years of relevant experience do you have?',
    inputType: 'number' as const,
    placeholder: 'e.g. 5',
    validate: (value: string) => {
      if (!value.trim()) return 'Enter your years of experience.';
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0 || num > 80) {
        return 'Enter a valid number of years (0–80).';
      }
      return undefined;
    },
  },
] as const;
