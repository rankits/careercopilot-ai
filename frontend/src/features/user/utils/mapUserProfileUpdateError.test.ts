import { describe, expect, it } from 'vitest';

import { mapUserProfileUpdateError } from './mapUserProfileUpdateError';

function axiosLikeError(data: unknown) {
  return Object.assign(new Error('request failed'), {
    isAxiosError: true,
    response: { data },
  });
}

describe('mapUserProfileUpdateError', () => {
  it('maps lastName validation errors to a friendly full-name message', () => {
    const result = mapUserProfileUpdateError(
      axiosLikeError({
        message: 'String must contain at least 1 character(s)',
        errors: [
          { field: 'body.lastName', message: 'String must contain at least 1 character(s)' },
        ],
      }),
    );

    expect(result.fieldErrors.fullName).toBe('Please enter both your first and last name.');
    expect(result.toastMessage).toBe('Please enter both your first and last name.');
  });

  it('maps opaque numeric validation errors to a generic toast', () => {
    const result = mapUserProfileUpdateError(
      axiosLikeError({
        message: 'Number must be less than or equal to 1',
      }),
    );

    expect(result.toastMessage).toBe("We couldn't save your details. Try again.");
  });
});
