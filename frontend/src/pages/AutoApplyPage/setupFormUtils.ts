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

export function validateFullName(fullName: string): string | undefined {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return 'Enter your full name.';
  }

  const { firstName, lastName } = splitFullName(trimmed);
  if (!firstName) {
    return 'Enter your full name.';
  }
  if (!lastName) {
    return 'Please enter both your first and last name.';
  }

  return undefined;
}

export function validateBasicIdentityFields(input: {
  preferredName: string;
  authorizationCountry: string;
}): Partial<Record<'preferredName' | 'authorizationCountry', string>> {
  const errors: Partial<Record<'preferredName' | 'authorizationCountry', string>> = {};

  const preferredName = input.preferredName.trim();
  if (preferredName.length > 80) {
    errors.preferredName = 'Preferred name must be 80 characters or fewer.';
  }

  const authorizationCountry = input.authorizationCountry.trim();
  if (authorizationCountry && !/^[A-Za-z]{2}$/.test(authorizationCountry)) {
    errors.authorizationCountry = 'Enter a 2-letter country code, e.g. US.';
  }

  return errors;
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
    label: (countryLabel: string) => `Authorized to work in ${countryLabel} without sponsorship`,
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
  requiresSponsorship: boolean | null | undefined,
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
  {
    key: 'professional_summary',
    label: 'Tell us about yourself',
    inputType: 'text' as const,
    placeholder: 'Summarize your experience, strengths, and impact.',
    validate: () => undefined,
  },
  {
    key: 'role_interest',
    label: 'Why are you interested in this role?',
    inputType: 'text' as const,
    placeholder: 'Describe what attracts you to the role.',
    validate: () => undefined,
  },
  {
    key: 'company_interest',
    label: 'Why do you want to work here?',
    inputType: 'text' as const,
    placeholder: 'Add a reusable answer that you can review per application.',
    validate: () => undefined,
  },
  {
    key: 'expected_salary_text',
    label: 'What are your salary expectations?',
    inputType: 'text' as const,
    placeholder: 'e.g. Flexible based on total compensation',
    validate: () => undefined,
  },
  {
    key: 'notice_period_text',
    label: 'What is your notice period?',
    inputType: 'text' as const,
    placeholder: 'e.g. 30 days',
    validate: () => undefined,
  },
] as const;
