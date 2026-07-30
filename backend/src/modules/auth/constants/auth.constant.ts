import { OtpPurpose } from '@prisma/client';
import { parseDurationSeconds } from '@/shared/security/jwt.util.js';
import { jwtConfig } from '@/shared/config/jwt.conf.js';

export const REFRESH_TOKEN_COOKIE_KEY = 'refreshToken';

/** Mirrors JWT_REFRESH_EXPIRES_IN so the cookie never outlives the "remember me" session it carries. */
export const REFRESH_TOKEN_EXPIRES_IN_MS =
  parseDurationSeconds(jwtConfig.refreshExpiresIn, 60 * 60 * 24 * 7) * 1000;

export const OTP_PURPOSE_LABELS: Record<OtpPurpose, string> = {
  [OtpPurpose.Registration]: 'email verification',
  [OtpPurpose.Login]: 'sign-in',
  [OtpPurpose.PasswordReset]: 'password reset',
};

/** Name of the Role every self-registered User is assigned. Only the Admin seed ever assigns the ADMIN role. */
export const DEFAULT_USER_ROLE_NAME = 'USER';

/**
 * Deliberately identical response for "no account" vs "account exists but
 * can't receive this OTP right now" on sensitive lookup endpoints
 * (login-otp request, forgot-password) to avoid leaking account existence.
 * Registration is intentionally NOT anti-enumerated - see auth.service.ts.
 */
export const GENERIC_OTP_SENT_MESSAGE =
  'If an account with that email exists, a verification code has been sent.';
