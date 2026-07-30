import type { UserWithRole } from "@/modules/auth/repositories/auth.repository.js";
import type { SafeUser, UserTokenContext } from "@/modules/auth/types/auth.types.js";

/** Strips internal id/credential fields before a user record leaves the module - `id` is always the publicId. */
export const toSafeUser = (user: UserWithRole): SafeUser => ({
  id: user.publicId,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  profileImage: user.profileImage,
  bio: user.bio,
  status: user.status,
  isEmailVerified: user.isEmailVerified,
  role: user.role.name,
  createdAt: user.createdAt,
});

export const toTokenContext = (user: UserWithRole): UserTokenContext => ({
  id: user.id,
  publicId: user.publicId,
  email: user.email,
  role: user.role.name,
  tokenVersion: user.tokenVersion,
});

/** JSON-safe wire shape for `SafeUser` (Date -> ISO string). */
export interface SafeUserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  profileImage: string | null;
  bio: string | null;
  status: string;
  isEmailVerified: boolean;
  role: string;
  createdAt: string;
}

export const toSafeUserResponse = (user: SafeUser): SafeUserResponseDto => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  profileImage: user.profileImage,
  bio: user.bio,
  status: user.status,
  isEmailVerified: user.isEmailVerified,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
});
