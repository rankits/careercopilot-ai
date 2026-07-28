import type { UserWithRole } from "../repositories/user.repository.js";
import type { PaginatedResult, UserListItem, UserProfile } from "../types/user.types.js";

export const toUserProfile = (user: UserWithRole): UserProfile => ({
  id: user.publicId,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  profileImage: user.profileImage,
  bio: user.bio,
  role: user.role.name,
  status: user.status,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const toUserListItem = (user: UserWithRole): UserListItem => ({
  id: user.publicId,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role.name,
  status: user.status,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
});

export interface UserProfileResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  profileImage: string | null;
  bio: string | null;
  role: string;
  status: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserListItemResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface PaginatedUsersResponseDto {
  items: UserListItemResponseDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const toUserProfileResponse = (profile: UserProfile): UserProfileResponseDto => ({
  ...profile,
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString(),
});

export const toUserListItemResponse = (item: UserListItem): UserListItemResponseDto => ({
  ...item,
  createdAt: item.createdAt.toISOString(),
});

export const toPaginatedUsersResponse = (
  result: PaginatedResult<UserListItem>,
): PaginatedUsersResponseDto => ({
  items: result.items.map(toUserListItemResponse),
  page: result.page,
  limit: result.limit,
  total: result.total,
  totalPages: result.totalPages,
});
