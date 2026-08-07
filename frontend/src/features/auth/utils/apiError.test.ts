import axios from 'axios';
import { describe, expect, it } from 'vitest';

import { getAuthErrorMessage } from './apiError';

describe('getAuthErrorMessage', () => {
  it('returns the backend login error message for invalid credentials', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          requestId: '02380f65-a5cc-4690-b2e9-7b7162d452a5',
          status: 'error',
        },
        status: 401,
      },
    };

    expect(getAuthErrorMessage(error, 'Unable to log in. Please try again.')).toBe(
      'Invalid email or password',
    );
    expect(axios.isAxiosError(error)).toBe(true);
  });

  it('returns a safe fallback for generic errors', () => {
    expect(getAuthErrorMessage(new Error('Sensitive server detail'), 'Unable to log in.')).toBe(
      'Unable to log in.',
    );
  });
});
