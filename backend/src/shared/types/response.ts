export interface ApiSuccessResponse<T = unknown> {
  status: "success";
  message: string;
  data?: T;
}

export interface ApiErrorResponse<T = unknown> {
  status: "error";
  message: string;
  errors?: T;
}
