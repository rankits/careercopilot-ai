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

/** External-facing user shape - `id` is always the `publicId`, never the internal db id. */
export interface SafeUser {
  id: string;
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
  /** Internal PK - used only for the UserSession FK, never exposed externally. */
  id: number;
  /** Public id - becomes the JWT `sub` claim. */
  publicId: string;
  email: string;
  role: string;
  tokenVersion: number;
}
