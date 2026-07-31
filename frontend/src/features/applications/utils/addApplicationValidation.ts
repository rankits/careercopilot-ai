import type {
  AddApplicationEntryMode,
  defaultAddApplicationForm,
} from '@/constants/pages/addApplication';
import { getTodayDateInputValue } from '@/constants/pages/addApplication';

type AddApplicationFormState = typeof defaultAddApplicationForm;

export type AddApplicationFormField =
  | 'appliedDate'
  | 'companyName'
  | 'jobTitle'
  | 'jobUrl'
  | 'location'
  | 'salaryMax'
  | 'salaryMin'
  | 'selectedJobId';

export type AddApplicationFormErrors = Partial<Record<AddApplicationFormField, string>>;

export interface AddApplicationValidationResult {
  errors: AddApplicationFormErrors;
  firstError: string | null;
  isValid: boolean;
}

const MAX_JOB_TITLE_LENGTH = 160;
const MAX_COMPANY_NAME_LENGTH = 160;
const MAX_LOCATION_LENGTH = 128;
const MAX_URL_LENGTH = 2048;

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseSalaryValue(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed.replace(/,/g, ''));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function validateJobUrl(value: string, required: boolean): string | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return required ? 'Job URL is required.' : undefined;
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return `Job URL must be ${MAX_URL_LENGTH} characters or fewer.`;
  }

  if (!isValidHttpUrl(trimmed)) {
    return 'Enter a valid HTTP or HTTPS URL.';
  }

  return undefined;
}

function validateAppliedDate(value: string): string | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return 'Applied date must be in YYYY-MM-DD format.';
  }

  if (trimmed > getTodayDateInputValue()) {
    return 'Applied date cannot be in the future.';
  }

  return undefined;
}

function validateSalaryFields(
  form: AddApplicationFormState,
): Pick<AddApplicationFormErrors, 'salaryMin' | 'salaryMax'> {
  const salaryMinRaw = form.salaryMin.trim();
  const salaryMaxRaw = form.salaryMax.trim();
  const errors: Pick<AddApplicationFormErrors, 'salaryMin' | 'salaryMax'> = {};

  if (salaryMinRaw && parseSalaryValue(salaryMinRaw) === null) {
    errors.salaryMin = 'Enter a valid minimum salary greater than 0.';
  }

  if (salaryMaxRaw && parseSalaryValue(salaryMaxRaw) === null) {
    errors.salaryMax = 'Enter a valid maximum salary greater than 0.';
  }

  const salaryMin = parseSalaryValue(form.salaryMin);
  const salaryMax = parseSalaryValue(form.salaryMax);

  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    errors.salaryMax = 'Maximum salary must be greater than or equal to minimum salary.';
  }

  return errors;
}

export function validateAddApplicationForm(
  entryMode: AddApplicationEntryMode,
  form: AddApplicationFormState,
  selectedJobId: string,
): AddApplicationValidationResult {
  const errors: AddApplicationFormErrors = {};

  if (entryMode === 'job-feed') {
    if (!selectedJobId) {
      errors.selectedJobId = 'Select a job from the feed to track.';
    }
  } else {
    const jobTitle = form.jobTitle.trim();

    if (!jobTitle) {
      errors.jobTitle = 'Job title is required.';
    } else if (jobTitle.length > MAX_JOB_TITLE_LENGTH) {
      errors.jobTitle = `Job title must be ${MAX_JOB_TITLE_LENGTH} characters or fewer.`;
    }

    const companyName = form.companyName.trim();

    if (!companyName) {
      errors.companyName = 'Company name is required.';
    } else if (companyName.length > MAX_COMPANY_NAME_LENGTH) {
      errors.companyName = `Company name must be ${MAX_COMPANY_NAME_LENGTH} characters or fewer.`;
    }

    const location = form.location.trim();

    if (location.length > MAX_LOCATION_LENGTH) {
      errors.location = `Location must be ${MAX_LOCATION_LENGTH} characters or fewer.`;
    }

    const jobUrlError = validateJobUrl(form.jobUrl, entryMode === 'external-url');
    if (jobUrlError) {
      errors.jobUrl = jobUrlError;
    }

    Object.assign(errors, validateSalaryFields(form));
  }

  const appliedDateError = validateAppliedDate(form.appliedDate);
  if (appliedDateError) {
    errors.appliedDate = appliedDateError;
  }

  const firstError = Object.values(errors).find(Boolean) ?? null;

  return {
    errors,
    firstError,
    isValid: firstError === null,
  };
}

export function validateAddApplicationField(
  field: AddApplicationFormField,
  entryMode: AddApplicationEntryMode,
  form: AddApplicationFormState,
  selectedJobId: string,
): string | undefined {
  return validateAddApplicationForm(entryMode, form, selectedJobId).errors[field];
}

export function validateCreateApplicationInput(
  entryMode: AddApplicationEntryMode,
  form: AddApplicationFormState,
  selectedJobId: string,
): string | null {
  return validateAddApplicationForm(entryMode, form, selectedJobId).firstError;
}
