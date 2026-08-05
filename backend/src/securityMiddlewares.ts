import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';

const router = express.Router();

const parseOrigins = (value: string | undefined): string[] =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const defaultOrigins = ['http://localhost:3000', 'http://localhost:4173', 'http://localhost:5001'];
const allowedOrigins = parseOrigins(process.env.CORS_ORIGIN);

// 'unsafe-inline' on style/script and data: on img/font are here only for
// swagger-ui-express's bundled assets at /api-docs (gated behind
// ENABLE_SWAGGER) - the JSON API responses this app otherwise returns
// aren't rendered documents, so CSP has no effect on them either way.
router.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
      },
    },
  }),
);

router.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
);

router.use(
  express.json({
    limit: '1mb',
  }),
);

router.use(hpp());

router.use(express.urlencoded({ limit: '1mb', extended: true }));

export default router;
