import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import { env, isProduction } from '@/shared/config/env.conf.js';

const router = express.Router();

const parseOrigins = (value: string | undefined): string[] =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

/** Localhost defaults are for local/dev only — production must set CORS_ORIGIN. */
const defaultOrigins = isProduction
  ? []
  : ['http://localhost:3000', 'http://localhost:4173', `http://localhost:${env.PORT}`];

const allowedOrigins = parseOrigins(env.CORS_ORIGIN);
const corsOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins;

router.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", ...corsOrigins, 'https:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

router.use(
  cors({
    origin: corsOrigins,
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
