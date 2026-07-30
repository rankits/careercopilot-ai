import { ApiErrorResponse, ApiSuccessResponse } from '@/shared/types/response.js';

export const successResponse = <T = unknown>(message: string, data?: T): ApiSuccessResponse<T> => {
  return {
    status: 'success',
    message,
    ...(data !== undefined && { data }),
  };
};

export const errorResponse = <T = unknown>(
  message: string,
  errors?: T,
  extra?: { code?: string; requestId?: string },
): ApiErrorResponse<T> => {
  return {
    status: 'error',
    message,
    ...(errors !== undefined && { errors }),
    ...(extra?.code !== undefined && { code: extra.code }),
    ...(extra?.requestId !== undefined && { requestId: extra.requestId }),
  };
};
