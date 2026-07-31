import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodObject, ZodIssue } from 'zod';
import { errorResponse } from '@/shared/utils/response.js';

export const validateResource =
  (schema: ZodObject<any>) => (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body ?? {},
        query: req.query,
        params: req.params,
      });

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const isDevelopment = process.env.NODE_ENV === 'development';

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
      console.error('Validation Error: ', error);
      return res.status(500).json(errorResponse('Internal server error'));
    }
  };
