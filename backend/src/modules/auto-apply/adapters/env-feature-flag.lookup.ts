import { env } from '@/shared/config/env.conf.js';
import { IFeatureFlagLookup } from '@/modules/auto-apply/contracts/application-readiness.contract.js';

export class EnvFeatureFlagLookup implements IFeatureFlagLookup {
  isAutoApplyEnabled(): boolean {
    return env.ENABLE_AUTO_APPLY;
  }
}
