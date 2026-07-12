import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Replace request with parsed typed data
      req.body = parsed.body || req.body;
      if (parsed.query) {
        for (const key of Object.keys(req.query)) {
          delete req.query[key];
        }
        Object.assign(req.query, parsed.query);
      }
      if (parsed.params) {
        for (const key of Object.keys(req.params)) {
          delete req.params[key];
        }
        Object.assign(req.params, parsed.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((e) => ({
            field: e.path.slice(1).join('.'), // skip first path item (body, query, params)
            message: e.message,
          })),
        });
      }
      console.error('Unexpected validation error:', error);
      return res.status(500).json({ error: 'Internal server error during validation' });
    }
  };
};
