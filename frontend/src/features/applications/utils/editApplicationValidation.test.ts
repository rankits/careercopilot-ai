import { describe, expect, it } from 'vitest';

import { validateEditApplicationForm } from './editApplicationValidation';

describe('validateEditApplicationForm', () => {
  it('requires job title and company name', () => {
    const result = validateEditApplicationForm({
      appliedDate: '',
      companyName: '',
      jobTitle: '',
      location: '',
      salaryMax: '',
      salaryMin: '',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.jobTitle).toBe('Job title is required.');
    expect(result.errors.companyName).toBe('Company name is required.');
  });

  it('validates salary fields', () => {
    const result = validateEditApplicationForm({
      appliedDate: '',
      companyName: 'Acme Corp',
      jobTitle: 'Engineer',
      location: '',
      salaryMax: 'invalid',
      salaryMin: '',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.salaryMax).toMatch(/enter a valid maximum salary/i);
  });
});
