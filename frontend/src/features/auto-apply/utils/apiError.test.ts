import axios, { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import {
  AutoApplyClientError,
  STATUS_CONFLICT_USER_MESSAGE,
  isStatusConflictError,
  normalizeAutoApplyError,
} from './apiError';

describe('normalizeAutoApplyError', () => {
  it('preserves backend error codes from axios responses', () => {
    const axiosError = new AxiosError('Conflict');
    axiosError.response = {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: { headers: {} } as never,
      data: {
        message: 'An auto-apply submission already exists for this job.',
        code: 'APPLICATION_EXISTS',
      },
    };

    const error = normalizeAutoApplyError(axiosError, 'fallback');

    expect(error).toBeInstanceOf(AutoApplyClientError);
    expect(error).toMatchObject({
      message: 'An auto-apply submission already exists for this job.',
      code: 'APPLICATION_EXISTS',
      statusCode: 409,
    });
  });

  it('AA-010: maps INVALID_STATUS_TRANSITION to the refresh conflict message', () => {
    const axiosError = new AxiosError('Conflict');
    axiosError.response = {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: { headers: {} } as never,
      data: {
        message: 'Cannot transition submission from X to Y',
        code: 'INVALID_STATUS_TRANSITION',
      },
    };

    const error = normalizeAutoApplyError(axiosError, 'fallback');

    expect(error).toMatchObject({
      message: STATUS_CONFLICT_USER_MESSAGE,
      code: 'INVALID_STATUS_TRANSITION',
      statusCode: 409,
    });
    expect(isStatusConflictError(error)).toBe(true);
  });

  it('still works when axios helper detects the error shape', () => {
    expect(axios.isAxiosError(new AxiosError('x'))).toBe(true);
  });
});
