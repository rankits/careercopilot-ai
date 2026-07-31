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

const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5001',
];

const configuredOrigins = parseOrigins(process.env.CORS_ORIGIN);
const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins;
const isDevelopment = process.env.NODE_ENV !== 'production';

const isLocalDevOrigin = (origin: string): boolean =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
    origin,
  );

router.use(helmet({ contentSecurityPolicy: false }));

router.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isDevelopment && isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
