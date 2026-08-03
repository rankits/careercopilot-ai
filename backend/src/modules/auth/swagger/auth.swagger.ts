import {
  createApiPost,
  createApiGet,
  successSchema,
  errorSchema,
} from '@/shared/swagger/factory.js';
import {
  safeUserSchema,
  accessTokenFields,
  commonSecureResponses,
} from '@/shared/swagger/schemas.js';

const BASE_URL = '/api/v1/auth';
const TAGS = ['Auth'];

const emailField = { type: 'string', format: 'email', example: 'jane.doe@example.com' };
const passwordField = {
  type: 'string',
  format: 'password',
  minLength: 8,
  description: 'Must include an uppercase letter, a lowercase letter, a digit and a symbol.',
  example: 'Str0ng!Passw0rd',
};
const otpCodeField = { type: 'string', pattern: '^\\d{6}$', example: '000000' };
const rememberMeField = {
  type: 'boolean',
  default: false,
  description:
    'If true, the session survives at the long-lived JWT_REFRESH_EXPIRES_IN TTL instead of the short one.',
};

/** `data.user` + top-level access token, returned by every flow that ends in an issued session. */
const sessionResponseSchema = successSchema(
  'Login successful',
  { user: safeUserSchema },
  accessTokenFields,
);

const genericOtpSentResponse = {
  description:
    'Generic confirmation (identical whether or not an account exists, to avoid account enumeration)',
  schema: successSchema('If an account with that email exists, a verification code has been sent.'),
};

export const authSwagger = {
  ...createApiPost(
    `${BASE_URL}/register`,
    {
      summary: 'Register a new account',
      description:
        'Creates the account, activates it immediately (no email verification code), and issues a session (refresh token via httpOnly cookie). Re-submitting for an existing, not-yet-verified email updates that account in place instead of creating a duplicate.',
      body: {
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: emailField,
          password: passwordField,
          firstName: { type: 'string', example: 'Jane' },
          lastName: { type: 'string', example: 'Doe' },
          phone: { type: 'string', nullable: true, example: '+14155552671' },
        },
      },
      responses: {
        201: {
          description: 'Account created - session issued',
          schema: sessionResponseSchema,
          headers: {
            'Set-Cookie': {
              description: 'httpOnly `refreshToken` cookie',
              schema: { type: 'string' },
            },
          },
        },
        400: {
          description: 'Validation error',
          schema: errorSchema('Payload is incorrect or missing fields.'),
        },
        409: {
          description: 'An account with this email is already fully verified',
          schema: errorSchema('An account with this email already exists', 'CONFLICT'),
        },
      },
    },
    false,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/otp/resend`,
    {
      summary: 'Resend a one-time code',
      description: 'Re-issues a code for the given purpose (login / password_reset).',
      body: {
        required: ['email', 'purpose'],
        properties: {
          email: emailField,
          purpose: {
            type: 'string',
            enum: ['login', 'password_reset'],
            example: 'login',
          },
        },
      },
      responses: {
        200: genericOtpSentResponse,
        400: { description: 'Validation error' },
        429: { description: 'Resend cooldown not yet elapsed, or the address has been blocked' },
      },
    },
    false,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/login`,
    {
      summary: 'Log in with email and password',
      body: {
        required: ['email', 'password'],
        properties: {
          email: emailField,
          password: { type: 'string', example: 'Str0ng!Passw0rd' },
          rememberMe: rememberMeField,
        },
      },
      responses: {
        200: {
          description: 'Login successful - session issued',
          schema: sessionResponseSchema,
          headers: {
            'Set-Cookie': {
              description: 'httpOnly `refreshToken` cookie',
              schema: { type: 'string' },
            },
          },
        },
        401: {
          description: 'Invalid email or password',
          schema: errorSchema('Invalid email or password', 'INVALID_CREDENTIALS'),
        },
        403: {
          description: 'Email not verified, or account suspended/deactivated',
          schema: errorSchema('Please verify your email before signing in', 'EMAIL_NOT_VERIFIED'),
        },
        423: {
          description: 'Account temporarily locked after too many failed attempts',
          schema: errorSchema(
            'Too many failed attempts. Try again after 2026-01-01T00:15:00.000Z',
            'ACCOUNT_LOCKED',
          ),
        },
      },
    },
    false,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/login/otp/request`,
    {
      summary: 'Request a one-time login code',
      description:
        'Emails a login code if, and only if, the account exists, is verified, and is active - the response is identical either way.',
      body: { required: ['email'], properties: { email: emailField } },
      responses: { 200: genericOtpSentResponse },
    },
    false,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/login/otp/verify`,
    {
      summary: 'Log in with a one-time code',
      body: {
        required: ['email', 'code'],
        properties: { email: emailField, code: otpCodeField, rememberMe: rememberMeField },
      },
      responses: {
        200: {
          description: 'Login successful - session issued',
          schema: sessionResponseSchema,
          headers: {
            'Set-Cookie': {
              description: 'httpOnly `refreshToken` cookie',
              schema: { type: 'string' },
            },
          },
        },
        400: { description: 'Invalid or expired code' },
      },
    },
    false,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/forgot-password`,
    {
      summary: 'Request a password reset code',
      body: { required: ['email'], properties: { email: emailField } },
      responses: { 200: genericOtpSentResponse },
    },
    false,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/reset-password`,
    {
      summary: 'Reset password with a code',
      description:
        'On success, every existing session for the account is revoked (a fresh login is required).',
      body: {
        required: ['email', 'code', 'newPassword'],
        properties: { email: emailField, code: otpCodeField, newPassword: passwordField },
      },
      responses: {
        200: {
          description: 'Password reset',
          schema: successSchema('Password has been reset. Please sign in with your new password.'),
        },
        400: { description: 'Invalid or expired code' },
      },
    },
    false,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/refresh-token`,
    {
      summary: 'Rotate the access/refresh token pair',
      description:
        'Reads the refresh token from the httpOnly cookie by default; `refreshToken` in the body is a fallback for non-browser clients. Presenting an already-rotated (reused) token revokes every session for that account as a precaution.',
      body: {
        properties: {
          refreshToken: { type: 'string', description: 'Fallback only - cookie is preferred.' },
        },
      },
      responses: {
        200: {
          description: 'Session refreshed',
          schema: successSchema('Session refreshed', undefined, accessTokenFields),
          headers: {
            'Set-Cookie': {
              description: 'Rotated httpOnly `refreshToken` cookie',
              schema: { type: 'string' },
            },
          },
        },
        401: {
          description: 'Missing, invalid, expired, or reused refresh token',
          schema: errorSchema('Invalid refresh token', 'TOKEN_INVALID'),
        },
      },
    },
    false,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/logout`,
    {
      summary: 'Log out the current session',
      description:
        'Idempotent - an unknown or already-revoked refresh token is a no-op, not an error.',
      body: {
        properties: {
          refreshToken: { type: 'string', description: 'Fallback only - cookie is preferred.' },
        },
      },
      responses: {
        200: { description: 'Logged out', schema: successSchema('Logged out successfully') },
      },
    },
    false,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/logout-all`,
    {
      summary: 'Log out every session',
      description:
        "Revokes all of the caller's sessions and bumps their token version, invalidating every currently-live access token too.",
      responses: {
        200: {
          description: 'Logged out from all devices',
          schema: successSchema('Logged out from all devices'),
        },
        ...commonSecureResponses,
      },
    },
    true,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/change-password`,
    {
      summary: "Change the current user's password",
      description:
        'On success, every session (including the one used to make this request) is revoked.',
      body: {
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', example: 'Str0ng!Passw0rd' },
          newPassword: passwordField,
        },
      },
      responses: {
        200: {
          description: 'Password changed',
          schema: successSchema(
            'Password changed. You have been signed out of all other sessions.',
          ),
        },
        401: {
          description: 'Current password is incorrect, or not authenticated',
          schema: errorSchema('Current password is incorrect', 'INVALID_CREDENTIALS'),
        },
      },
    },
    true,
    TAGS,
  ),

  ...createApiGet(
    `${BASE_URL}/me`,
    {
      summary: "Get the current session's profile",
      responses: {
        200: {
          description: 'Current user profile',
          schema: successSchema('Current session', safeUserSchema),
        },
        ...commonSecureResponses,
      },
    },
    true,
    TAGS,
  ),
};
