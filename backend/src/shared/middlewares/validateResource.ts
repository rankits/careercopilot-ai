import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodObject, ZodIssue } from 'zod';
import { errorResponse } from '@/shared/utils/response.js';
import { isDevelopment } from '@/shared/config/env.conf.js';
import { logger } from '@/shared/logger/logger.js';

export const validateResource =
  (schema: ZodObject<any>) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body ?? {},
        query: req.query,
        params: req.params,
      });

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        if (isDevelopment) {
          const errors = error.issues.map((err: ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
          }));

          return res
            .status(400)
            .json(errorResponse(errors[0]?.message || 'Validation error', errors));
        }

        return res.status(400).json(errorResponse('Payload is incorrect or missing fields.'));
      }
      logger.error(
        { err: error, event: 'validation.unexpected_error' },
        'Validation middleware error',
      );
      return res.status(500).json(errorResponse('Internal server error'));
    }
  };
