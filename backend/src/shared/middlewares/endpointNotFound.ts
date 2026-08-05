import { NextFunction, Request, Response } from 'express';
import { errorResponse } from '@/shared/utils/response.js';

export const endpointNotFound = (req: Request, res: Response, _next: NextFunction) => {
  return res.status(404).json(errorResponse('Endpoint not found'));
};
