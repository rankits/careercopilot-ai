import type { Status } from "@prisma/client";

export interface RequestContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
}

/** External-facing shape - `id` is always the `publicId`, never the internal db id. */
export interface SafeAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  status: Status;
  role: string;
  createdAt: Date;
}

export interface AdminSession {
  admin: SafeAdmin;
  tokens: AuthTokens;
}

/** What `admin-token.service.ts` needs to mint an access token and create a session row. */
export interface AdminTokenContext {
  /** Internal PK - used only for the AdminSession FK, never exposed externally. */
  id: number;
  /** Public id - becomes the JWT `sub` claim. */
  publicId: string;
  email: string;
  role: string;
  tokenVersion: number;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  pendingVerificationUsers: number;
  totalAdmins: number;
}
