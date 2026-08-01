import { describe, expect, it } from 'vitest';

import { defaultAddApplicationForm } from '@/constants/pages/addApplication';

import {
  validateAddApplicationField,
  validateAddApplicationForm,
  validateCreateApplicationInput,
} from './addApplicationValidation';
import { buildCreateApplicationPayload } from './createApplicationPayload';

describe('buildCreateApplicationPayload', () => {
  it('builds a manual application payload', () => {
    expect(
      buildCreateApplicationPayload('manual', {
        ...defaultAddApplicationForm,
        appliedDate: '2025-05-08',
        companyName: 'Acme Corp',
        jobTitle: 'Senior Full Stack Engineer',
        jobUrl: 'https://acme.com/jobs/123',
        location: 'San Francisco, CA',
        salaryMax: '180000',
        salaryMin: '150000',
      }),
    ).toEqual({
      sourceType: 'MANUAL',
      appliedAt: '2025-05-08',
      jobTitle: 'Senior Full Stack Engineer',
      companyName: 'Acme Corp',
      location: 'San Francisco, CA',
      originalJobUrl: 'https://acme.com/jobs/123',
      currentStatus: 'SAVED',
      priority: 'MEDIUM',
      salaryMin: 150000,
      salaryMax: 180000,
      salaryCurrency: 'USD',
      salaryPeriod: 'YEAR',
    });
  });

  it('builds an external url application payload', () => {
    expect(
      buildCreateApplicationPayload('external-url', {
        ...defaultAddApplicationForm,
        appliedDate: '',
        companyName: 'Acme Corp',
        jobTitle: 'Senior Full Stack Engineer',
        jobUrl: 'https://acme.com/jobs/123',
        location: 'San Francisco, CA',
      }),
    ).toEqual({
      sourceType: 'EXTERNAL_JOB_URL',
      originalJobUrl: 'https://acme.com/jobs/123',
      jobTitle: 'Senior Full Stack Engineer',
      companyName: 'Acme Corp',
      location: 'San Francisco, CA',
      currentStatus: 'SAVED',
      priority: 'MEDIUM',
    });
  });
});

describe('validateAddApplicationForm', () => {
  it('requires job title and company name for manual entry', () => {
    expect(validateAddApplicationForm('manual', defaultAddApplicationForm, '')).toEqual({
      errors: {
        companyName: 'Company name is required.',
        jobTitle: 'Job title is required.',
      },
      firstError: 'Job title is required.',
      isValid: false,
    });
  });

  it('requires a valid job url for external url entry', () => {
    expect(
      validateAddApplicationForm(
        'external-url',
        {
          ...defaultAddApplicationForm,
          companyName: 'Acme Corp',
          jobTitle: 'Engineer',
          jobUrl: 'not-a-url',
        },
        '',
      ).errors.jobUrl,
    ).toBe('Enter a valid HTTP or HTTPS URL.');
  });

  it('rejects a future applied date', () => {
    expect(
      validateAddApplicationForm(
        'manual',
        {
          ...defaultAddApplicationForm,
          appliedDate: '2999-01-01',
          companyName: 'Acme Corp',
          jobTitle: 'Engineer',
        },
        '',
      ).errors.appliedDate,
    ).toBe('Applied date cannot be in the future.');
  });

  it('rejects invalid salary values and min greater than max', () => {
    expect(
      validateAddApplicationForm(
        'manual',
        {
          ...defaultAddApplicationForm,
          companyName: 'Acme Corp',
          jobTitle: 'Engineer',
          salaryMax: '100000',
          salaryMin: 'abc',
        },
        '',
      ).errors,
    ).toEqual({
      salaryMin: 'Enter a valid minimum salary greater than 0.',
    });

    expect(
      validateAddApplicationForm(
        'manual',
        {
          ...defaultAddApplicationForm,
          companyName: 'Acme Corp',
          jobTitle: 'Engineer',
          salaryMax: '50000',
          salaryMin: '100000',
        },
        '',
      ).errors.salaryMax,
    ).toBe('Maximum salary must be greater than or equal to minimum salary.');
  });

  it('requires a selected job in job feed mode', () => {
    expect(
      validateAddApplicationForm('job-feed', defaultAddApplicationForm, '').errors.selectedJobId,
    ).toBe('Select a job from the feed to track.');
  });
});

describe('validateAddApplicationField', () => {
  it('returns a single field error', () => {
    expect(validateAddApplicationField('jobTitle', 'manual', defaultAddApplicationForm, '')).toBe(
      'Job title is required.',
    );
  });
});

describe('validateCreateApplicationInput', () => {
  it('returns the first validation error message', () => {
    expect(validateCreateApplicationInput('manual', defaultAddApplicationForm, '')).toBe(
      'Job title is required.',
    );
  });
});
