import type { Status } from '@prisma/client';

export interface RequestContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

/** External-facing shape - `id` is always the `publicId`, never the internal db id. */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  profileImage: string | null;
  bio: string | null;
  role: string;
  status: Status;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: Status;
  isEmailVerified: boolean;
  createdAt: Date;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
