import { errorSchema } from "./factory.js";
import type { ApiResponses } from "../types/swagger.types.js";

/** Mirrors `modules/auth/utils/auth.mapper.ts#SafeUserResponseDto`. */
export const safeUserSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid", example: "3f6b1e2a-4b8e-4d2a-9c3a-2e6f1a2b3c4d" },
    email: { type: "string", format: "email", example: "jane.doe@example.com" },
    firstName: { type: "string", example: "Jane" },
    lastName: { type: "string", example: "Doe" },
    phone: { type: "string", nullable: true, example: "+14155552671" },
    profileImage: { type: "string", nullable: true, example: null },
    bio: { type: "string", nullable: true, example: null },
    status: {
      type: "string",
      enum: ["pending_verification", "active", "suspended", "deactivated"],
      example: "active",
    },
    isEmailVerified: { type: "boolean", example: true },
    role: { type: "string", example: "USER" },
    createdAt: { type: "string", format: "date-time", example: "2026-01-15T09:30:00.000Z" },
  },
};

/** Mirrors `modules/admin/utils/admin.mapper.ts#SafeAdminResponseDto`. */
export const safeAdminSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid", example: "9a1b2c3d-4e5f-4a6b-8c7d-1e2f3a4b5c6d" },
    email: { type: "string", format: "email", example: "admin@careercopilot.dev" },
    firstName: { type: "string", example: "Platform" },
    lastName: { type: "string", example: "Admin" },
    profileImage: { type: "string", nullable: true, example: null },
    status: {
      type: "string",
      enum: ["pending_verification", "active", "suspended", "deactivated"],
      example: "active",
    },
    role: { type: "string", example: "ADMIN" },
    createdAt: { type: "string", format: "date-time", example: "2026-01-01T00:00:00.000Z" },
  },
};

/** Access-token pair returned in the response body (never the httpOnly refresh cookie contents). */
export const accessTokenFields = {
  accessToken: {
    type: "string",
    description: "Short-lived bearer JWT - send as `Authorization: Bearer <token>`.",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  },
  accessTokenExpiresInSeconds: { type: "integer", example: 900 },
};

/** Full token pair as returned in a response `data` object (admin endpoints - no cookie transport). */
export const authTokensSchema = {
  type: "object",
  properties: {
    accessToken: accessTokenFields.accessToken,
    refreshToken: { type: "string", example: "8f14e45fceea167a5a36dedd4bea2543..." },
    tokenType: { type: "string", example: "Bearer" },
    expiresInSeconds: { type: "integer", example: 900 },
  },
};

export const paginatedSchema = (itemSchema: Record<string, unknown>) => ({
  type: "object",
  properties: {
    items: { type: "array", items: itemSchema },
    page: { type: "integer", example: 1 },
    limit: { type: "integer", example: 20 },
    total: { type: "integer", example: 42 },
    totalPages: { type: "integer", example: 3 },
  },
});

/** Common 401/403/500 responses most authenticated endpoints share. */
export const commonSecureResponses: ApiResponses = {
  401: {
    description: "Missing, invalid, expired, or revoked access token",
    schema: errorSchema("Authentication required"),
  },
};

export const commonAdminResponses: ApiResponses = {
  ...commonSecureResponses,
  403: {
    description: "Caller is authenticated but is not an ADMIN principal/role",
    schema: errorSchema("This action is not available for this account type"),
  },
};
