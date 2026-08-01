import { USER_PROFILE_SERVICE } from '@/modules/user/contracts/user-profile.service.js';
import { userProfileService } from '@/modules/user/services/user.service.js';
import { ModuleServiceRegistry } from '@/shared/registry/module-service.registry.js';

export const serviceRegistry = new ModuleServiceRegistry();

serviceRegistry.register(USER_PROFILE_SERVICE, userProfileService);
