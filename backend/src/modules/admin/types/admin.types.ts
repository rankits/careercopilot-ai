import type { Status } from '@prisma/client';

export interface RequestContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
}

/** External-facing shape - `id` is the internal numeric db id for consistency with other responses. */
export interface SafeAdmin {
  id: number;
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
  /** Internal PK - used only for the AdminSession FK and JWT `sub` claim. */
  id: number;
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
