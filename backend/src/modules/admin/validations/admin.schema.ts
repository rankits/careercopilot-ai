import { z, ZodTypeAny } from "zod";
import { securityConfig } from "@/shared/config/security.conf.js";
import { PasswordUtil } from "@/shared/security/password.util.js";

const withEnvelope = (body: ZodTypeAny) =>
  z.object({ body, query: z.object({}).optional(), params: z.object({}).optional() });

const emailSchema = z.string().trim().toLowerCase().email("Please provide a valid email address");

const passwordSchema = z
  .string()
  .min(
    securityConfig.password.minLength,
    `Password must be at least ${securityConfig.password.minLength} characters`,
  )
  .max(128, "Password is too long")
  .refine((value) => PasswordUtil.meetsPolicy(value), {
    message: "Password must include an uppercase letter, a lowercase letter, a number and a symbol",
  });

export const adminLoginSchema = withEnvelope(
  z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
    rememberMe: z.boolean().optional().default(false),
  }),
);

export const adminChangePasswordSchema = withEnvelope(
  z
    .object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: passwordSchema,
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: "New password must be different from the current password",
      path: ["newPassword"],
    }),
);

export const adminRefreshTokenSchema = withEnvelope(
  z.object({
    refreshToken: z.string().min(20, "A valid refresh token is required"),
  }),
);

export const adminLogoutSchema = withEnvelope(
  z.object({
    refreshToken: z.string().min(20, "A valid refresh token is required"),
  }),
);

export type AdminLoginInput = z.infer<typeof adminLoginSchema>["body"];
export type AdminChangePasswordInput = z.infer<typeof adminChangePasswordSchema>["body"];
export type AdminRefreshTokenInput = z.infer<typeof adminRefreshTokenSchema>["body"];
export type AdminLogoutInput = z.infer<typeof adminLogoutSchema>["body"];
