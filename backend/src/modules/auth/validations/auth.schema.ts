import { z, ZodTypeAny } from 'zod';
import { OtpPurpose } from '@prisma/client';
import { securityConfig } from '@/shared/config/security.conf.js';
import { PasswordUtil } from '@/shared/security/password.util.js';

/** `validateResource` always parses `{ body, query, params }` - this wraps a body schema into that envelope. */
const withEnvelope = (body: ZodTypeAny) =>
  z.object({
    body,
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  });

const emailSchema = z.string().trim().toLowerCase().email('Please provide a valid email address');

const passwordSchema = z
  .string()
  .min(
    securityConfig.password.minLength,
    `Password must be at least ${securityConfig.password.minLength} characters`,
  )
  .max(128, 'Password is too long')
  .refine((value) => PasswordUtil.meetsPolicy(value), {
    message: 'Password must include an uppercase letter, a lowercase letter, a number and a symbol',
  });

const nameSchema = z.string().trim().min(1, 'This field is required').max(80, 'Too long');

const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^(\d{10}|\+?[1-9]\d{7,14})$/,
    'Enter a valid phone number, e.g. 9876543210 or +919876543210',
  );

const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Code must be numeric')
  .length(securityConfig.otp.length, `Code must be ${securityConfig.otp.length} digits`);

export const registerSchema = withEnvelope(
  z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema.optional(),
  }),
);

export const resendOtpSchema = withEnvelope(
  z.object({
    email: emailSchema,
    purpose: z.nativeEnum(OtpPurpose).refine((purpose) => purpose !== OtpPurpose.Registration, {
      message: 'Registration no longer requires a verification code',
    }),
  }),
);

export const loginSchema = withEnvelope(
  z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false),
  }),
);

export const loginOtpRequestSchema = withEnvelope(
  z.object({
    email: emailSchema,
  }),
);

export const loginOtpVerifySchema = withEnvelope(
  z.object({
    email: emailSchema,
    code: otpCodeSchema,
    rememberMe: z.boolean().optional().default(false),
  }),
);

export const forgotPasswordSchema = withEnvelope(
  z.object({
    email: emailSchema,
  }),
);

export const resetPasswordSchema = withEnvelope(
  z.object({
    email: emailSchema,
    code: otpCodeSchema,
    newPassword: passwordSchema,
  }),
);

export const changePasswordSchema = withEnvelope(
  z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: passwordSchema,
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: 'New password must be different from the current password',
      path: ['newPassword'],
    }),
);

/**
 * Refresh/logout accept the refresh token from the httpOnly cookie by
 * default; `refreshToken` in the body is an optional fallback for
 * non-browser clients that can't rely on cookies.
 */
export const refreshTokenSchema = withEnvelope(
  z.object({
    refreshToken: z.string().min(20).optional(),
  }),
);

export const logoutSchema = withEnvelope(
  z.object({
    refreshToken: z.string().min(20).optional(),
  }),
);

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type ResendOtpInput = z.infer<typeof resendOtpSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type LoginOtpRequestInput = z.infer<typeof loginOtpRequestSchema>['body'];
export type LoginOtpVerifyInput = z.infer<typeof loginOtpVerifySchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type LogoutInput = z.infer<typeof logoutSchema>['body'];
