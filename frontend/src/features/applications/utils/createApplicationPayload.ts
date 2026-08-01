import type { AddApplicationEntryMode, JobFeedPickerJob } from '@/constants/pages/addApplication';
import type { defaultAddApplicationForm } from '@/constants/pages/addApplication';

import type {
  ApiApplicationPriority,
  ApiApplicationStatus,
  CreateApplicationPayload,
} from '../types/application.types';
import type { ApplicationPriority } from '../types/application.view.types';

type AddApplicationFormState = typeof defaultAddApplicationForm;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseOptionalSalary(value: string): number | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed.replace(/,/g, ''));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function mapFormPriority(priority: ApplicationPriority): ApiApplicationPriority {
  return priority.toUpperCase() as ApiApplicationPriority;
}

function mapFormStatus(status: string): ApiApplicationStatus {
  return status.toUpperCase() as ApiApplicationStatus;
}

function buildSalaryFields(form: AddApplicationFormState) {
  const salaryMin = parseOptionalSalary(form.salaryMin);
  const salaryMax = parseOptionalSalary(form.salaryMax);
  const hasSalary = salaryMin !== undefined || salaryMax !== undefined;

  if (!hasSalary) {
    return {};
  }

  return {
    salaryCurrency: form.currency,
    salaryMax,
    salaryMin,
    salaryPeriod: 'YEAR' as const,
  };
}

function buildAppliedAtField(form: AddApplicationFormState) {
  const appliedDate = form.appliedDate.trim();

  if (!appliedDate) {
    return {};
  }

  return { appliedAt: appliedDate };
}

function buildCommonFields(form: AddApplicationFormState) {
  return {
    currentStatus: mapFormStatus(form.initialStatus),
    priority: mapFormPriority(form.priority),
    ...buildAppliedAtField(form),
  };
}

export function buildCreateApplicationPayload(
  entryMode: AddApplicationEntryMode,
  form: AddApplicationFormState,
  selectedJob?: JobFeedPickerJob,
): CreateApplicationPayload {
  const common = buildCommonFields(form);

  if (entryMode === 'external-url') {
    return {
      sourceType: 'EXTERNAL_JOB_URL',
      originalJobUrl: form.jobUrl.trim(),
      jobTitle: form.jobTitle.trim(),
      companyName: form.companyName.trim(),
      ...(form.location.trim() ? { location: form.location.trim() } : {}),
      ...common,
      ...buildSalaryFields(form),
    };
  }

  if (entryMode === 'job-feed' && selectedJob) {
    if (UUID_REGEX.test(selectedJob.id)) {
      return {
        sourceType: 'PLATFORM_JOB',
        jobId: selectedJob.id,
        ...common,
      };
    }

    return {
      sourceType: 'MANUAL',
      jobTitle: selectedJob.title,
      companyName: selectedJob.company,
      ...(selectedJob.location ? { location: selectedJob.location } : {}),
      ...common,
    };
  }

  return {
    sourceType: 'MANUAL',
    jobTitle: form.jobTitle.trim(),
    companyName: form.companyName.trim(),
    ...(form.location.trim() ? { location: form.location.trim() } : {}),
    ...(form.jobUrl.trim() ? { originalJobUrl: form.jobUrl.trim() } : {}),
    ...common,
    ...buildSalaryFields(form),
  };
}

export {
  validateAddApplicationField,
  validateAddApplicationForm,
  validateCreateApplicationInput,
} from './addApplicationValidation';
export type {
  AddApplicationFormErrors,
  AddApplicationFormField,
  AddApplicationValidationResult,
} from './addApplicationValidation';
