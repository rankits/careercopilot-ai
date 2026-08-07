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

    // AI Mail Composer (server-only; Phase 1A uses the deterministic fake provider)
    AI_MAIL_ENABLED: booleanFromString(false),
    AI_MAIL_SAVE_DRAFTS_ENABLED: booleanFromString(true),
    AI_MAIL_PARTIAL_REWRITE_ENABLED: booleanFromString(true),
    AI_PROVIDER: z.enum(['fake', 'openrouter']).default('fake'),
    OPENROUTER_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
    OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
    OPENROUTER_MODEL: z.preprocess(emptyToUndefined, z.string().optional()),
    OPENROUTER_FALLBACK_MODELS: z.preprocess(emptyToUndefined, z.string().optional()),
    OPENROUTER_HTTP_REFERER: z.preprocess(emptyToUndefined, z.string().url().optional()),
    OPENROUTER_APP_NAME: z.string().min(1).default('Career Copilot'),
    OPENROUTER_STRUCTURED_OUTPUT_ENABLED: booleanFromString(true),
    OPENROUTER_FREE_ROUTER_ALLOWED: booleanFromString(true),
    AI_MAIL_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.4),
    AI_MAIL_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().max(32_000).default(1200),
    AI_MAIL_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(45_000),
    AI_MAIL_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    AI_MAIL_MAX_JD_CHARACTERS: z.coerce.number().int().positive().default(20_000),
    AI_MAIL_MAX_CONSTRAINT_CHARACTERS: z.coerce.number().int().positive().default(3000),
    AI_MAIL_MAX_ADDITIONAL_CONTEXT_CHARACTERS: z.coerce.number().int().positive().default(3000),
    AI_MAIL_MAX_SUBJECT_CHARACTERS: z.coerce.number().int().positive().default(160),
    AI_MAIL_MAX_BODY_CHARACTERS: z.coerce.number().int().positive().default(12_000),
    AI_MAIL_MAX_PROFILE_SKILLS: z.coerce.number().int().positive().default(50),
    AI_MAIL_MAX_EXPERIENCE_ENTRIES: z.coerce.number().int().positive().default(10),
    AI_MAIL_MAX_EXPERIENCE_HIGHLIGHTS_PER_ENTRY: z.coerce.number().int().positive().default(8),
    AI_MAIL_MAX_PROJECTS: z.coerce.number().int().positive().default(10),
    AI_MAIL_MAX_ACHIEVEMENTS: z.coerce.number().int().positive().default(20),
    AI_MAIL_MAX_JOB_REQUIREMENTS: z.coerce.number().int().positive().default(30),
    AI_MAIL_MAX_JOB_RESPONSIBILITIES: z.coerce.number().int().positive().default(30),
    AI_MAIL_MAX_JOB_KEYWORDS: z.coerce.number().int().positive().default(50),
    AI_MAIL_GENERATIONS_PER_USER_PER_HOUR: z.coerce.number().int().positive().default(20),
    AI_MAIL_REGENERATIONS_PER_DRAFT: z.coerce.number().int().positive().default(10),
    AI_MAIL_LOG_PROMPT_CONTENT: booleanFromString(false),
    AI_MAIL_LOG_RESPONSE_CONTENT: booleanFromString(false),
    AI_MAIL_STORE_GENERATION_CONTEXT: booleanFromString(false),
    AI_MAIL_CONTEXT_RETENTION_DAYS: z.coerce.number().int().min(0).default(0),
    AI_MAIL_PROMPT_VERSION: z.string().min(1).default('v1'),
    AI_MAIL_OUTPUT_SCHEMA_VERSION: z.string().min(1).default('v1'),
    AI_MAIL_MAX_REVISIONS_PER_DRAFT: z.coerce.number().int().positive().default(20),
    AI_MAIL_FAKE_MODE: z
      .enum(['success', 'timeout', 'malformed', 'unsupported_claim', 'unavailable'])
      .default('success'),
    /** @deprecated Prefer GOOGLE_GMAIL_SEND_ENABLED; kept as alias for Phase 2A. */
    GMAIL_INTEGRATION_ENABLED: booleanFromString(false),
    GOOGLE_GMAIL_SEND_ENABLED: booleanFromString(false),
    MAIL_SENDING_ENABLED: booleanFromString(false),
    MAIL_SENDS_PER_USER_PER_HOUR: z.coerce.number().int().positive().default(10),
    MAIL_SENDS_PER_USER_PER_DAY: z.coerce.number().int().positive().default(30),
    AI_MAIL_RECIPIENT_HMAC_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
    AI_MAIL_MIN_FOLLOW_UP_INTERVAL_HOURS: z.coerce.number().int().positive().default(72),

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
    // AA-092: staged rollout — percent 0–100 (100 = all users when allowlist empty).
    ASSISTED_APPLY_HANDOFF_ROLLOUT_PERCENT: z.coerce.number().int().min(0).max(100).default(100),
    ASSISTED_APPLY_WORKSPACE_ROLLOUT_PERCENT: z.coerce.number().int().min(0).max(100).default(100),
    // Comma-separated user ids always included in both Phase 1 cohorts.
    ASSISTED_APPLY_ROLLOUT_ALLOWLIST: z.preprocess(emptyToUndefined, z.string().optional()),
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

    // Connected Accounts / Google OAuth (mailbox linking — separate from login)
    GOOGLE_GMAIL_ENABLED: booleanFromString(false),
    GOOGLE_OAUTH_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
    GOOGLE_OAUTH_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
    GOOGLE_OAUTH_REDIRECT_URI: z.preprocess(emptyToUndefined, z.string().url().optional()),
    GOOGLE_OAUTH_AUTHORIZATION_URL: z
      .string()
      .url()
      .default('https://accounts.google.com/o/oauth2/v2/auth'),
    GOOGLE_OAUTH_TOKEN_URL: z.string().url().default('https://oauth2.googleapis.com/token'),
    GOOGLE_OAUTH_REVOKE_URL: z.string().url().default('https://oauth2.googleapis.com/revoke'),
    GOOGLE_OAUTH_SCOPES: z
      .string()
      .default('openid,email,profile,https://www.googleapis.com/auth/gmail.send'),
    GOOGLE_OAUTH_ACCESS_TYPE: z.string().default('offline'),
    GOOGLE_OAUTH_INCLUDE_GRANTED_SCOPES: booleanFromString(true),
    GOOGLE_OAUTH_PROMPT: z.string().default('consent'),
    GOOGLE_TOKEN_ENCRYPTION_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
    GOOGLE_TOKEN_ENCRYPTION_KEY_ID: z.string().default('v1'),
    GOOGLE_OAUTH_STATE_SIGNING_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
    GOOGLE_OAUTH_STATE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
    GOOGLE_OAUTH_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    GOOGLE_API_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    GOOGLE_TOKEN_REFRESH_SKEW_SECONDS: z.coerce.number().int().positive().default(300),
    GOOGLE_OAUTH_SUCCESS_REDIRECT_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
    GOOGLE_OAUTH_FAILURE_REDIRECT_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
    MAIL_PROVIDER: z.enum(['google', 'none']).default('none'),

    // Sign-in-with-Google (identity login — openid/email/profile only)
    GOOGLE_LOGIN_ENABLED: booleanFromString(false),
    GOOGLE_LOGIN_REDIRECT_URI: z.preprocess(emptyToUndefined, z.string().url().optional()),
    GOOGLE_LOGIN_SCOPES: z.string().default('openid,email,profile'),
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

    if (value.AI_MAIL_ENABLED && value.AI_PROVIDER === 'openrouter') {
      if (value.OPENROUTER_API_KEY == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['OPENROUTER_API_KEY'],
          message: 'OPENROUTER_API_KEY is required when AI Mail uses OpenRouter',
        });
      }
      if (value.OPENROUTER_MODEL == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['OPENROUTER_MODEL'],
          message: 'OPENROUTER_MODEL is required when AI Mail uses OpenRouter',
        });
      }
    }

    const googleSendEnabled = value.GOOGLE_GMAIL_SEND_ENABLED || value.GMAIL_INTEGRATION_ENABLED;
    if ((value.MAIL_SENDING_ENABLED || googleSendEnabled) && !value.GOOGLE_GMAIL_ENABLED) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GOOGLE_GMAIL_ENABLED'],
        message:
          'GOOGLE_GMAIL_ENABLED must be true (with OAuth secrets) when mail sending flags are enabled',
      });
    }

    if (value.MAIL_SENDING_ENABLED) {
      if (!value.AI_MAIL_RECIPIENT_HMAC_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AI_MAIL_RECIPIENT_HMAC_SECRET'],
          message: 'AI_MAIL_RECIPIENT_HMAC_SECRET is required when MAIL_SENDING_ENABLED is true',
        });
      } else {
        try {
          const buf = Buffer.from(value.AI_MAIL_RECIPIENT_HMAC_SECRET, 'base64');
          if (buf.length < 32) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['AI_MAIL_RECIPIENT_HMAC_SECRET'],
              message: 'AI_MAIL_RECIPIENT_HMAC_SECRET must decode to at least 32 bytes',
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['AI_MAIL_RECIPIENT_HMAC_SECRET'],
            message: 'AI_MAIL_RECIPIENT_HMAC_SECRET must be a valid base64 string',
          });
        }
      }
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

    if (value.GOOGLE_GMAIL_ENABLED) {
      const requiredGoogleVars = [
        'GOOGLE_OAUTH_CLIENT_ID',
        'GOOGLE_OAUTH_CLIENT_SECRET',
        'GOOGLE_OAUTH_REDIRECT_URI',
        'GOOGLE_TOKEN_ENCRYPTION_KEY',
        'GOOGLE_OAUTH_STATE_SIGNING_KEY',
        'GOOGLE_OAUTH_SUCCESS_REDIRECT_URL',
        'GOOGLE_OAUTH_FAILURE_REDIRECT_URL',
      ] as const;

      for (const req of requiredGoogleVars) {
        if (!value[req]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [req],
            message: `${req} is required when GOOGLE_GMAIL_ENABLED is true`,
          });
        }
      }

      if (value.GOOGLE_TOKEN_ENCRYPTION_KEY) {
        try {
          const buf = Buffer.from(value.GOOGLE_TOKEN_ENCRYPTION_KEY, 'base64');
          if (buf.length !== 32) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['GOOGLE_TOKEN_ENCRYPTION_KEY'],
              message:
                'GOOGLE_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes for AES-256-GCM',
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['GOOGLE_TOKEN_ENCRYPTION_KEY'],
            message: 'GOOGLE_TOKEN_ENCRYPTION_KEY must be a valid base64 string',
          });
        }
      }

      if (value.GOOGLE_OAUTH_STATE_SIGNING_KEY) {
        try {
          const buf = Buffer.from(value.GOOGLE_OAUTH_STATE_SIGNING_KEY, 'base64');
          if (buf.length < 32) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['GOOGLE_OAUTH_STATE_SIGNING_KEY'],
              message: 'GOOGLE_OAUTH_STATE_SIGNING_KEY must decode to at least 32 bytes of entropy',
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['GOOGLE_OAUTH_STATE_SIGNING_KEY'],
            message: 'GOOGLE_OAUTH_STATE_SIGNING_KEY must be a valid base64 string',
          });
        }
      }
    }

    if (value.GOOGLE_LOGIN_ENABLED) {
      const requiredLoginVars = [
        'GOOGLE_OAUTH_CLIENT_ID',
        'GOOGLE_OAUTH_CLIENT_SECRET',
        'GOOGLE_LOGIN_REDIRECT_URI',
        'GOOGLE_OAUTH_STATE_SIGNING_KEY',
      ] as const;

      for (const req of requiredLoginVars) {
        if (!value[req]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [req],
            message: `${req} is required when GOOGLE_LOGIN_ENABLED is true`,
          });
        }
      }

      if (value.GOOGLE_OAUTH_STATE_SIGNING_KEY && !value.GOOGLE_GMAIL_ENABLED) {
        try {
          const buf = Buffer.from(value.GOOGLE_OAUTH_STATE_SIGNING_KEY, 'base64');
          if (buf.length < 32) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['GOOGLE_OAUTH_STATE_SIGNING_KEY'],
              message: 'GOOGLE_OAUTH_STATE_SIGNING_KEY must decode to at least 32 bytes of entropy',
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['GOOGLE_OAUTH_STATE_SIGNING_KEY'],
            message: 'GOOGLE_OAUTH_STATE_SIGNING_KEY must be a valid base64 string',
          });
        }
      }
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
