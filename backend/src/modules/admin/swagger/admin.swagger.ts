import { createApiPost, createApiGet, successSchema, errorSchema } from "@/shared/swagger/factory.js";
import { safeAdminSchema, authTokensSchema, commonAdminResponses } from "@/shared/swagger/schemas.js";

const BASE_URL = "/api/v1/admin";
const TAGS = ["Admin"];

const emailField = { type: "string", format: "email", example: "admin@careercopilot.dev" };
const passwordField = {
  type: "string",
  format: "password",
  minLength: 8,
  description: "Must include an uppercase letter, a lowercase letter, a digit and a symbol.",
  example: "Str0ng!Passw0rd",
};
const rememberMeField = { type: "boolean", default: false };

export const adminSwagger = {
  ...createApiPost(
    `${BASE_URL}/auth/login`,
    {
      summary: "Admin login",
      description:
        "Password-only - admin accounts are provisioned via `npm run prisma:seed`, there is no self-registration or OTP flow. Unlike the user-facing auth module, the refresh token is returned directly in the response body (no cookie transport).",
      body: {
        required: ["email", "password"],
        properties: { email: emailField, password: { type: "string", example: "Str0ng!Passw0rd" }, rememberMe: rememberMeField },
      },
      responses: {
        200: {
          description: "Login successful",
          schema: successSchema("Login successful", { admin: safeAdminSchema, tokens: authTokensSchema }),
        },
        401: {
          description: "Invalid email or password",
          schema: errorSchema("Invalid email or password", "INVALID_CREDENTIALS"),
        },
        403: {
          description: "Admin account is suspended or deactivated",
          schema: errorSchema("This admin account is not active. Contact a platform owner.", "ACCOUNT_NOT_ACTIVE"),
        },
        423: {
          description: "Account temporarily locked after too many failed attempts",
          schema: errorSchema("Too many failed attempts. Try again after 2026-01-01T00:15:00.000Z", "ACCOUNT_LOCKED"),
        },
      },
    },
    false,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/auth/refresh-token`,
    {
      summary: "Rotate the admin access/refresh token pair",
      description: "Presenting an already-rotated (reused) token revokes every session for that admin as a precaution.",
      body: { required: ["refreshToken"], properties: { refreshToken: { type: "string" } } },
      responses: {
        200: { description: "Session refreshed", schema: successSchema("Session refreshed", authTokensSchema) },
        401: {
          description: "Invalid, expired, or reused refresh token",
          schema: errorSchema("Invalid refresh token", "TOKEN_INVALID"),
        },
      },
    },
    false,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/auth/logout`,
    {
      summary: "Admin logout",
      description: "Idempotent - an unknown or already-revoked refresh token is a no-op, not an error.",
      body: { required: ["refreshToken"], properties: { refreshToken: { type: "string" } } },
      responses: {
        200: { description: "Logged out", schema: successSchema("Logged out successfully") },
      },
    },
    false,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/auth/logout-all`,
    {
      summary: "Log out every admin session",
      responses: {
        200: { description: "Logged out from all devices", schema: successSchema("Logged out from all devices") },
        ...commonAdminResponses,
      },
    },
    true,
    TAGS,
  ),

  ...createApiPost(
    `${BASE_URL}/auth/change-password`,
    {
      summary: "Change the current admin's password",
      description: "On success, every session is revoked.",
      body: {
        required: ["currentPassword", "newPassword"],
        properties: { currentPassword: { type: "string", example: "Str0ng!Passw0rd" }, newPassword: passwordField },
      },
      responses: {
        200: {
          description: "Password changed",
          schema: successSchema("Password changed. You have been signed out of all other sessions."),
        },
        401: {
          description: "Current password is incorrect, or not authenticated",
          schema: errorSchema("Current password is incorrect", "INVALID_CREDENTIALS"),
        },
        ...commonAdminResponses,
      },
    },
    true,
    TAGS,
  ),

  ...createApiGet(
    `${BASE_URL}/auth/me`,
    {
      summary: "Get the current admin's profile",
      responses: {
        200: { description: "Current admin profile", schema: successSchema("Current session", safeAdminSchema) },
        ...commonAdminResponses,
      },
    },
    true,
    TAGS,
  ),

  ...createApiGet(
    `${BASE_URL}/stats`,
    {
      summary: "Platform system statistics",
      responses: {
        200: {
          description: "System statistics",
          schema: successSchema("System statistics", {
            totalUsers: { type: "integer", example: 128 },
            activeUsers: { type: "integer", example: 110 },
            pendingVerificationUsers: { type: "integer", example: 14 },
            totalAdmins: { type: "integer", example: 3 },
          }),
        },
        ...commonAdminResponses,
      },
    },
    true,
    TAGS,
  ),
};
