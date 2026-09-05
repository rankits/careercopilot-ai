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

/** External-facing user shape - `id` is the internal auto-increment database id. */
export interface SafeUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  profileImage: string | null;
  bio: string | null;
  status: Status;
  isEmailVerified: boolean;
  isProfileCreated: boolean;
  role: string;
  createdAt: Date;
}

export interface AuthSession {
  user: SafeUser;
  tokens: AuthTokens;
}

/** What `token.service.ts` needs to mint an access token and create a session row. */
export interface UserTokenContext {
  /** Internal PK - used only for the UserSession FK and JWT `sub` claim. */
  id: number;
  email: string;
  role: string;
  tokenVersion: number;
}
