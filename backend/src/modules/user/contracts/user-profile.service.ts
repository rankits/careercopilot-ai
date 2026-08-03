import type { UserProfile } from '@/modules/user/types/user.types.js';
import { createModuleServiceToken } from '@/shared/registry/module-service.registry.js';

export interface UserProfileService {
  getUserProfile(publicId: string): Promise<UserProfile | null>;
}

export const USER_PROFILE_SERVICE =
  createModuleServiceToken<UserProfileService>('user.profile-service');
