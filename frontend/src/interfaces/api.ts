export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface ApiErrorResponse {
  message: string;
  statusCode?: number;
  code?: string;
  errors?: Record<string, string[]>;
}
