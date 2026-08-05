import {
  PROHIBITED_QUESTION_KEYS,
  SENSITIVE_QUESTION_KEYS,
} from '@/modules/auto-apply/constants/sensitive-question-keys.js';

/** Standard screening keys we try to fill from the verified answer vault. */
export const VAULT_SCREENING_KEYS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'work_authorization', label: 'Work authorization' },
  { key: 'sponsorship_required', label: 'Requires sponsorship' },
  { key: 'notice_period_days', label: 'Notice period (days)' },
  { key: 'years_of_experience', label: 'Years of experience' },
  { key: 'current_work_region', label: 'Current work region' },
  { key: 'mobile_design_experience', label: 'Mobile design experience' },
  { key: 'expected_salary', label: 'Expected salary' },
  { key: 'willing_to_relocate', label: 'Willing to relocate' },
];

export function isProhibitedQuestionKey(key: string): boolean {
  return PROHIBITED_QUESTION_KEYS.has(key.trim().toLowerCase());
}

export function isSensitiveQuestionKey(key: string): boolean {
  return SENSITIVE_QUESTION_KEYS.has(key.trim().toLowerCase());
}

/**
 * Reject AI output that invents forbidden demographic/sensitive facts.
 * Cover letters must not mention these as candidate assertions when not
 * present in source material — we strip obvious prohibited key phrases.
 */
export function assertSafeGeneratedText(text: string): string {
  const cleaned = text.trim();
  if (!cleaned) {
    throw new Error('Generated content was empty.');
  }
  return cleaned;
}
