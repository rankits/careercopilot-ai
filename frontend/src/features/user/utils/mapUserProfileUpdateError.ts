import axios from 'axios';

type PersonalContactField = 'fullName' | 'phone';

interface ApiValidationError {
  field?: string;
  message?: string;
}

export interface UserProfileUpdateErrorResult {
  fieldErrors: Partial<Record<PersonalContactField, string>>;
  toastMessage: string;
}

const DEFAULT_TOAST = "We couldn't save your details. Try again.";

const FIELD_TO_CONTACT: Record<string, PersonalContactField> = {
  'body.firstName': 'fullName',
  firstName: 'fullName',
  'body.lastName': 'fullName',
  lastName: 'fullName',
  'body.phone': 'phone',
  phone: 'phone',
};

function mapValidationMessage(field: PersonalContactField | undefined, message: string): string {
  if (field === 'fullName') {
    if (/must contain at least 1 character/i.test(message) || /required/i.test(message)) {
      return 'Please enter both your first and last name.';
    }
    if (/must contain at most 80/i.test(message)) {
      return 'Full name must be 80 characters or fewer.';
    }
    return 'Please enter your full name.';
  }

  if (field === 'phone') {
    if (/valid phone/i.test(message)) {
      return 'Enter a valid phone number, e.g. +14155552671.';
    }
    return 'Enter a valid phone number, e.g. +14155552671.';
  }

  if (/Number must be less than or equal to/i.test(message)) {
    return DEFAULT_TOAST;
  }

  return DEFAULT_TOAST;
}

function extractValidationErrors(payload: unknown): ApiValidationError[] {
  if (typeof payload !== 'object' || payload === null) return [];

  if ('errors' in payload && Array.isArray(payload.errors)) {
    return payload.errors.filter(
      (entry): entry is ApiValidationError =>
        typeof entry === 'object' && entry !== null && ('field' in entry || 'message' in entry),
    );
  }

  return [];
}

export function mapUserProfileUpdateError(error: unknown): UserProfileUpdateErrorResult {
  if (!axios.isAxiosError(error)) {
    return { fieldErrors: {}, toastMessage: DEFAULT_TOAST };
  }

  const payload: unknown = error.response?.data;
  const validationErrors = extractValidationErrors(payload);
  const fieldErrors: Partial<Record<PersonalContactField, string>> = {};

  for (const entry of validationErrors) {
    const rawField = typeof entry.field === 'string' ? entry.field : '';
    const contactField = FIELD_TO_CONTACT[rawField];
    const rawMessage = typeof entry.message === 'string' ? entry.message : DEFAULT_TOAST;
    if (!contactField || fieldErrors[contactField]) continue;
    fieldErrors[contactField] = mapValidationMessage(contactField, rawMessage);
  }

  const topLevelMessage =
    typeof payload === 'object' &&
    payload !== null &&
    'message' in payload &&
    typeof payload.message === 'string'
      ? payload.message
      : DEFAULT_TOAST;

  const toastMessage =
    fieldErrors.fullName ?? fieldErrors.phone ?? mapValidationMessage(undefined, topLevelMessage);

  return { fieldErrors, toastMessage };
}
