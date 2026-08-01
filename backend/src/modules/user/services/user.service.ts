import { AuditAction } from '@prisma/client';
import { userRepository } from '@/modules/user/repositories/user.repository.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { toUserListItem, toUserProfile } from '@/modules/user/utils/user.mapper.js';
import type { ListUsersQuery, UpdateProfileInput } from '@/modules/user/validations/user.schema.js';
import type {
  PaginatedResult,
  RequestContext,
  UserListItem,
  UserProfile,
} from '@/modules/user/types/user.types.js';
import type { UserProfileService } from '@/modules/user/contracts/user-profile.service.js';

/**
 * User-owned implementation of the cross-module profile contract.
 * Consumers resolve USER_PROFILE_SERVICE from the central service registry
 * at execution time rather than importing this function or the repository.
 */
export const getUserProfile = async (userId: number): Promise<UserProfile | null> => {
  const user = await userRepository.findById(userId);
  return user ? toUserProfile(user) : null;
};

export const getMyProfile = async (userId: number): Promise<UserProfile> => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError('Account not found', 404);
  }
  return toUserProfile(user);
};

export const updateMyProfile = async (
  userId: number,
  input: UpdateProfileInput,
  context: RequestContext,
): Promise<UserProfile> => {
  const existing = await userRepository.findById(userId);
  if (!existing) {
    throw new AppError('Account not found', 404);
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

export const listUsers = async (query: ListUsersQuery): Promise<PaginatedResult<UserListItem>> => {
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
