export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface ApiErrorResponse {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}
