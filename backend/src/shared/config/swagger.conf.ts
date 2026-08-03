import { authSwagger } from '@/modules/auth/swagger/index.js';
import { userSwagger } from '@/modules/user/swagger/index.js';
import { adminSwagger } from '@/modules/admin/swagger/index.js';
import { applicationSwagger } from '@/modules/application-management/swagger/index.js';
import { recommendationsSwagger } from '@/modules/recommendations/swagger/index.js';
import { env } from '@/shared/config/env.conf.js';

/**
 * Aggregated OpenAPI 3.0 document, served at `/api-docs` (see `app.ts`).
 * Each implemented module owns its own `swagger/*.swagger.ts` fragment
 * (paths only) built via `shared/swagger/factory.ts`; this file only
 * merges them under one spec. Modules that are still placeholder scaffolds
 * contribute nothing here — add their import + spread once they gain real
 * endpoints.
 */
export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'CareerCopilot API',
    version: '1.0.0',
    description: 'API documentation for the CareerCopilot backend.',
  },
  servers: [
    {
      url: env.BASE_URL || `http://localhost:${env.PORT}`,
      description: `${env.NODE_ENV} environment`,
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    ...authSwagger,
    ...userSwagger,
    ...adminSwagger,
    ...applicationSwagger,
    ...recommendationsSwagger,
  },
};
