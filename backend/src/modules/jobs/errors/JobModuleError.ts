import { AppError } from '@/shared/utils/errors/AppError.js';

export class JobModuleError extends AppError {
  constructor(message: string, statusCode = 500) {
    super(message, statusCode);
  }
}
