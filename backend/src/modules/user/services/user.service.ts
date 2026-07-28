import { AuditAction } from "@prisma/client";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../../../shared/utils/errors/AppError.js";
import { toUserListItem, toUserProfile } from "../utils/user.mapper.js";
import type { ListUsersQuery, UpdateProfileInput } from "../validations/user.schema.js";
import type { PaginatedResult, RequestContext, UserListItem, UserProfile } from "../types/user.types.js";

/**
 * Cross-module lookup: other modules (resume, applications, ...) that need
 * a user's profile should import this directly rather than reaching into
 * `userRepository`, so the "external-facing shape" mapping stays in one
 * place.
 */
export const getUserProfile = async (publicId: string): Promise<UserProfile | null> => {
  const user = await userRepository.findByPublicId(publicId);
  return user ? toUserProfile(user) : null;
};

export const getMyProfile = async (publicId: string): Promise<UserProfile> => {
  const user = await userRepository.findByPublicId(publicId);
  if (!user) {
    throw new AppError("Account not found", 404);
  }
  return toUserProfile(user);
};

export const updateMyProfile = async (
  publicId: string,
  input: UpdateProfileInput,
  context: RequestContext,
): Promise<UserProfile> => {
  const existing = await userRepository.findByPublicId(publicId);
  if (!existing) {
    throw new AppError("Account not found", 404);
  }

  const updated = await userRepository.updateProfile(existing.id, input);
  await userRepository.writeAuditLog({
    userId: existing.id,
    action: AuditAction.ProfileUpdated,
    context,
    metadata: { fields: Object.keys(input) },
  });

  return toUserProfile(updated);
};

export const listUsers = async (
  query: ListUsersQuery,
): Promise<PaginatedResult<UserListItem>> => {
  const { items, total } = await userRepository.list(query);
  return {
    items: items.map(toUserListItem),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
};

export default { getUserProfile, getMyProfile, updateMyProfile, listUsers };
