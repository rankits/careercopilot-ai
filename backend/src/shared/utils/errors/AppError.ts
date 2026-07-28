export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  data?: unknown;

  constructor(message: string, statusCode = 400, code?: string, data?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.data = data;
  }
}
