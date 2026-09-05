/** E.164-ish max: '+' + up to 15 digits. */
export const PHONE_MAX_LENGTH = 16;

/** National number length when a dial code is selected separately. */
export const NATIONAL_PHONE_MAX_LENGTH = 15;

/** Register form national number length (e.g. 10-digit Indian mobile). */
export const REGISTER_NATIONAL_PHONE_MAX_LENGTH = 10;

export const COUNTRY_DIAL_CODES = [
  { code: '+91', label: 'IN (+91)', region: 'IN' },
  { code: '+1', label: 'US/CA (+1)', region: 'US' },
  { code: '+44', label: 'UK (+44)', region: 'GB' },
  { code: '+61', label: 'AU (+61)', region: 'AU' },
  { code: '+971', label: 'AE (+971)', region: 'AE' },
  { code: '+65', label: 'SG (+65)', region: 'SG' },
  { code: '+49', label: 'DE (+49)', region: 'DE' },
  { code: '+33', label: 'FR (+33)', region: 'FR' },
  { code: '+81', label: 'JP (+81)', region: 'JP' },
  { code: '+86', label: 'CN (+86)', region: 'CN' },
] as const;

export type CountryDialCode = (typeof COUNTRY_DIAL_CODES)[number]['code'];

/**
 * Keep a leading '+' (for +91 / international) and digits only.
 * Spaces/dashes are stripped while typing.
 */
export function sanitizePhoneInput(value: string): string {
  const startsWithPlus = value.trimStart().startsWith('+');
  const digits = value.replace(/\D/g, '').slice(0, 15);
  if (startsWithPlus) {
    return `+${digits}`.slice(0, PHONE_MAX_LENGTH);
  }
  return digits;
}

/** Digits only for national number entry (country code selected separately). */
export function sanitizeNationalPhoneInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, NATIONAL_PHONE_MAX_LENGTH);
}

/** Digits only for register national number; strips pasted country code when present. */
export function sanitizeRegisterNationalPhoneInput(
  value: string,
  dialCode: CountryDialCode,
): string {
  let digits = value.replace(/\D/g, '');
  const dialDigits = dialCode.replace(/\D/g, '');

  if (
    dialDigits &&
    digits.startsWith(dialDigits) &&
    digits.length > REGISTER_NATIONAL_PHONE_MAX_LENGTH
  ) {
    digits = digits.slice(dialDigits.length);
  }

  return digits.slice(0, REGISTER_NATIONAL_PHONE_MAX_LENGTH);
}

export function composePhoneWithDialCode(dialCode: string, nationalNumber: string): string {
  const national = sanitizeNationalPhoneInput(nationalNumber);
  const code = dialCode.startsWith('+') ? dialCode : `+${dialCode}`;
  return `${code}${national}`;
}

/** Always default to India (+91). */
export function getDefaultCountryDialCode(): CountryDialCode {
  return '+91';
}

/** 10-digit local, or international (+91… / E.164). */
export const PHONE_PATTERN = /^(\d{10}|\+[1-9]\d{7,14}|[1-9]\d{7,14})$/;

export function isValidPhoneNumber(value: string): boolean {
  const normalized = sanitizePhoneInput(value);
  if (!normalized) return false;
  return PHONE_PATTERN.test(normalized);
}
