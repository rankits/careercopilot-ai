import { getTodayDateInputValue } from '@/constants/pages/addApplication';

export interface EditApplicationFormState {
  appliedDate: string;
  companyName: string;
  jobTitle: string;
  location: string;
  salaryMax: string;
  salaryMin: string;
}

export type EditApplicationFormField = keyof EditApplicationFormState;

export type EditApplicationFormErrors = Partial<Record<EditApplicationFormField, string>>;

export interface EditApplicationValidationResult {
  errors: EditApplicationFormErrors;
  firstError: string | null;
  isValid: boolean;
}

const MAX_JOB_TITLE_LENGTH = 160;
const MAX_COMPANY_NAME_LENGTH = 160;
const MAX_LOCATION_LENGTH = 128;

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
  form: EditApplicationFormState,
): Pick<EditApplicationFormErrors, 'salaryMin' | 'salaryMax'> {
  const salaryMinRaw = form.salaryMin.trim();
  const salaryMaxRaw = form.salaryMax.trim();
  const errors: Pick<EditApplicationFormErrors, 'salaryMin' | 'salaryMax'> = {};

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

export function validateEditApplicationForm(
  form: EditApplicationFormState,
): EditApplicationValidationResult {
  const errors: EditApplicationFormErrors = {};
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

  const appliedDateError = validateAppliedDate(form.appliedDate);
  if (appliedDateError) {
    errors.appliedDate = appliedDateError;
  }

  Object.assign(errors, validateSalaryFields(form));

  const firstError = Object.values(errors).find(Boolean) ?? null;

  return {
    errors,
    firstError,
    isValid: firstError === null,
  };
}
