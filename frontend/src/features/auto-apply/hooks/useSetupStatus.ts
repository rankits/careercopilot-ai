import { useQuery } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';

export function useSetupStatus() {
  return useQuery({
    enabled: hasAuthSession(),
    queryFn: () => autoApplyService.getSetupStatus(),
    queryKey: autoApplyQueryKeys.setupStatus,
    staleTime: 15_000,
  });
}
