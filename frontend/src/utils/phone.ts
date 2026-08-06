/** E.164-ish max: '+' + up to 15 digits. */
export const PHONE_MAX_LENGTH = 16;

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

/** 10-digit local, or international (+91… / E.164). */
export const PHONE_PATTERN = /^(\d{10}|\+[1-9]\d{7,14}|[1-9]\d{7,14})$/;

export function isValidPhoneNumber(value: string): boolean {
  const normalized = sanitizePhoneInput(value);
  if (!normalized) return false;
  return PHONE_PATTERN.test(normalized);
}
