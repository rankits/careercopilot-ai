import { describe, expect, it } from 'vitest';

import { getAnalysisFailureMessage, getApiErrorMessage } from './errors';

describe('errors utils', () => {
  it('returns fallback for empty errors', () => {
    expect(getApiErrorMessage(null)).toBe('Something went wrong');
    expect(getApiErrorMessage('', 'Custom')).toBe('Custom');
  });

  it('reads string and Error messages', () => {
    expect(getApiErrorMessage('  Boom  ')).toBe('Boom');
    expect(getApiErrorMessage(new Error('Network down'))).toBe('Network down');
  });

  it('prefers API response message and field errors', () => {
    const withMessage = Object.assign(new Error('HTTP request failed'), {
      response: { data: { message: 'Resume not found' } },
    });
    expect(getApiErrorMessage(withMessage)).toBe('Resume not found');

    const withField = Object.assign(new Error('HTTP request failed'), {
      response: { data: { errors: [{ message: 'targetRole is required' }] } },
    });
    expect(getApiErrorMessage(withField)).toBe('targetRole is required');
  });

  it('builds analysis failure messages', () => {
    expect(
      getAnalysisFailureMessage({ failureReason: 'Analysis failed: Out of credits' }),
    ).toBe('Out of credits');
    expect(
      getAnalysisFailureMessage({
        failureReason: null,
        weaknesses: ['Analysis failed: Unauthorized provider'],
      }),
    ).toBe('Unauthorized provider');
    expect(getAnalysisFailureMessage({})).toBe('Analysis failed. Please try again.');
  });
});
