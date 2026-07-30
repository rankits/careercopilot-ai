import { env } from '@/shared/config/env.conf.js';

/**
 * Centralized, tunable security knobs for authentication & authorization.
 * Keeping these in one place makes the auth module's edge-case behavior
 * (lockouts, OTP lifetimes, rate limits) auditable at a glance.
 */
export const securityConfig = {
  otp: {
    length: env.OTP_LENGTH,
    ttlSeconds: env.OTP_TTL_SECONDS,
    resendCooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
    maxResendCount: env.OTP_MAX_RESEND_COUNT,
  },

  password: {
    minLength: env.PASSWORD_MIN_LENGTH,
    // Requires at least one lowercase, one uppercase, one digit, one symbol.
    policyRegex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
  },

  lockout: {
    threshold: env.ACCOUNT_LOCK_THRESHOLD,
    durationMinutes: env.ACCOUNT_LOCK_DURATION_MINUTES,
  },

  sessions: {
    maxRefreshTokensPerUser: env.REFRESH_TOKEN_MAX_SESSIONS,
    shortSessionTtlSeconds: env.SHORT_SESSION_TTL_HOURS * 60 * 60,
  },

  rateLimit: {
    global: {
      windowMinutes: env.RATE_LIMIT_WINDOW_MINUTES,
      max: env.RATE_LIMIT_MAX_REQUESTS,
    },
    auth: {
      windowMinutes: env.AUTH_RATE_LIMIT_WINDOW_MINUTES,
      max: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    },
    otp: {
      windowMinutes: env.AUTH_RATE_LIMIT_WINDOW_MINUTES,
      max: env.OTP_RATE_LIMIT_MAX_REQUESTS,
    },
  },
};
