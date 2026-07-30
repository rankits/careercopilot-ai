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

router.use(helmet({ contentSecurityPolicy: false }));

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
