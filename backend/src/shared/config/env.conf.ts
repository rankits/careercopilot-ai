import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

// Loaded here, as the first thing this module does, rather than relying on
// the entrypoint (server.ts) to call `dotenv.config()` first: ES module
// imports are hoisted and execute before any of an importing file's own
// top-level statements, so a `dotenv.config()` call in server.ts would run
// AFTER this file (reached transitively via `./app.js`) already read
// `process.env` - too late for DATABASE_URL etc. to be populated.

/**
 * Coerces common truthy/falsy env-var string representations into a boolean.
 * `z.coerce.boolean()` is deliberately avoided since it treats ANY
 * non-empty string (including the literal text "false") as `true`.
 */
const booleanFromString = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value === '') return defaultValue;
      return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
    });

/** Compose often injects "" for unset optional vars; treat blanks as missing. */
const emptyToUndefined = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  return value.trim() === '' ? undefined : value;
};

const envSchema = z
  .object({
    // Application
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5001),
    BASE_URL: z.string().optional(),
    APP_NAME: z.string().min(1).default('CareerCopilot'),

    // Database (PostgreSQL / Prisma)
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // Caching layer
    CACHE_DRIVER: z.enum(['memory', 'redis']).default('memory'),
    REDIS_MODE: z.enum(['standalone', 'sentinel', 'cluster']).default('standalone'),
    REDIS_HOST: z.string().default('127.0.0.1'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_KEY_PREFIX: z.string().default('careercopilot:'),

    // Messaging layer (RabbitMQ)
    RABBITMQ_URL: z.string().default('amqp://guest:guest@localhost:5672'),

    // JWT
    JWT_ACCESS_SECRET: z
      .string()
      .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters')
      .default('default_access_secret_for_development_change_in_production'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters')
      .default('default_refresh_secret_for_development_change_in_production'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    JWT_ISSUER: z.string().default('careercopilot-api'),
    JWT_AUDIENCE: z.string().default('careercopilot-client'),

    // Logger
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    // Mailer (SMTP) - defaults target a local Mailpit-style dev container
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_SECURE: booleanFromString(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM_NAME: z.string().default('CareerCopilot'),
    MAIL_FROM_ADDRESS: z.string().email().default('no-reply@careercopilot.dev'),

    // Security / auth tuning
    OTP_LENGTH: z.coerce.number().int().min(4).max(10).default(6),
    OTP_TTL_SECONDS: z.coerce.number().int().positive().default(600),
    OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    OTP_MAX_RESEND_COUNT: z.coerce.number().int().positive().default(20),
    PASSWORD_MIN_LENGTH: z.coerce.number().int().min(6).default(8),
    ACCOUNT_LOCK_THRESHOLD: z.coerce.number().int().positive().default(5),
    ACCOUNT_LOCK_DURATION_MINUTES: z.coerce.number().int().positive().default(15),
    REFRESH_TOKEN_MAX_SESSIONS: z.coerce.number().int().positive().default(5),
    SHORT_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24),

    // Rate limiting
    RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(300),
    AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
    AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
    OTP_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(5),
    JOB_LISTING_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(1),
    JOB_LISTING_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(60),
    RECOMMENDATION_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
    RECOMMENDATION_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),

    // Job Age & Retention Policies (day-based; embedding window may be tighter than storage)
    JOB_STORAGE_AGE_FILTER_ENABLED: booleanFromString(true),
    JOB_STORAGE_MAX_AGE_DAYS: z.coerce.number().int().positive().default(90),
    JOB_EMBEDDING_AGE_FILTER_ENABLED: booleanFromString(true),
    JOB_EMBEDDING_MAX_AGE_DAYS: z.coerce.number().int().positive().default(5),
    JOB_UNKNOWN_DATE_POLICY: z
      .enum(['REJECT', 'ALLOW_STORAGE_ONLY', 'ALLOW'])
      .default('ALLOW_STORAGE_ONLY'),
    JOB_STORAGE_EXPIRED_ACTION: z.enum(['EXPIRE', 'DELETE']).default('EXPIRE'),
    JOB_REMOVE_OUTDATED_EMBEDDINGS: booleanFromString(true),
    JOB_RETENTION_CLEANUP_BATCH_SIZE: z.coerce.number().int().positive().default(500),
    JOB_EMBEDDING_CLEANUP_BATCH_SIZE: z.coerce.number().int().positive().default(500),

    // Startup Ingestion
    JOB_INGESTION_ON_STARTUP_ENABLED: booleanFromString(false),
    JOB_INGESTION_ON_STARTUP_DELAY_MS: z.coerce.number().int().min(0).max(300_000).default(5000),
    JOB_INGESTION_ON_STARTUP_FAIL_APPLICATION: booleanFromString(false),
    JOB_INGESTION_ON_STARTUP_LOCK_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(7200)
      .default(1800),
    JOB_INGESTION_ON_STARTUP_PROVIDERS: z.preprocess(emptyToUndefined, z.string().optional()),
    JOB_INGESTION_ON_STARTUP_ALLOWED_TIERS: z.preprocess(emptyToUndefined, z.string().optional()),

    // Feature flags
    ENABLE_EMAIL_WORKER: booleanFromString(true),
    // When true, /health probes RabbitMQ even if ENABLE_EMAIL_WORKER is false.
    HEALTH_CHECK_RABBITMQ: booleanFromString(false),
    ENABLE_SWAGGER: booleanFromString(true),
    // Global Auto Apply kill switch — when false, PLAN/APPROVE/QUEUE/SUBMIT all fail closed.
    ENABLE_AUTO_APPLY: booleanFromString(true),
    // AA-070: direct external handoff (no RabbitMQ). Default on; set false to kill-switch.
    ASSISTED_APPLY_DIRECT_HANDOFF: booleanFromString(true),
    // Chromium snapshot for JS-heavy job pages (Ashby etc). Set false to skip.
    ENABLE_AUTO_APPLY_HEADLESS_SNAPSHOT: booleanFromString(true),
    // Optional path to system Chromium (Alpine docker: /usr/bin/chromium-browser).
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: z.preprocess(emptyToUndefined, z.string().optional()),
    // Run database seeds automatically when the server starts (dev only)
    RUN_SEEDS_ON_STARTUP: booleanFromString(true),

    // Default admin bootstrap (consumed by prisma/seed/admin.seed.ts)
    ADMIN_DEFAULT_EMAIL: z.preprocess(emptyToUndefined, z.string().email().optional()),
    ADMIN_DEFAULT_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(8).optional()),
    ADMIN_DEFAULT_FIRST_NAME: z.preprocess(emptyToUndefined, z.string().min(1).default('Platform')),
    ADMIN_DEFAULT_LAST_NAME: z.preprocess(emptyToUndefined, z.string().min(1).default('Admin')),
  })
  .superRefine((value, ctx) => {
    if (
      value.JOB_EMBEDDING_AGE_FILTER_ENABLED &&
      value.JOB_STORAGE_AGE_FILTER_ENABLED &&
      value.JOB_EMBEDDING_MAX_AGE_DAYS > value.JOB_STORAGE_MAX_AGE_DAYS
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JOB_EMBEDDING_MAX_AGE_DAYS'],
        message:
          'JOB_EMBEDDING_MAX_AGE_DAYS must be <= JOB_STORAGE_MAX_AGE_DAYS when both filters are enabled',
      });
    }

    if (value.NODE_ENV !== 'production') return;

    const insecureDefaults = new Set([
      'default_access_secret_for_development_change_in_production',
      'default_refresh_secret_for_development_change_in_production',
    ]);

    if (insecureDefaults.has(value.JWT_ACCESS_SECRET) || value.JWT_ACCESS_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message:
          'JWT_ACCESS_SECRET must be a strong, non-default secret (>=32 chars) in production',
      });
    }

    if (insecureDefaults.has(value.JWT_REFRESH_SECRET) || value.JWT_REFRESH_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message:
          'JWT_REFRESH_SECRET must be a strong, non-default secret (>=32 chars) in production',
      });
    }

    if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;
/** Exported for unit tests of cross-field env validation. */
export { envSchema };

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  // Logger is intentionally not used here: logger config itself depends on
  // env being valid, so we fail fast with a plain stderr write and a
  // non-zero exit before any other module finishes loading.
  console.error(`\nInvalid environment configuration:\n${formatted}\n`);
  process.exit(1);
}

export const env: Env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
