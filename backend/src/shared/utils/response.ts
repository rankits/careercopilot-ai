import { ApiErrorResponse, ApiSuccessResponse } from "../types/response.js";

export const successResponse = <T = unknown>(message: string, data?: T): ApiSuccessResponse<T> => {
  return {
    status: "success",
    message,
    ...(data !== undefined && { data }),
  };
};

export const errorResponse = <T = unknown>(message: string, errors?: T): ApiErrorResponse<T> => {
  return {
    status: "error",
    message,
    ...(errors !== undefined && { errors }),
  };
};
