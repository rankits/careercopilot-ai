import { useQuery } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';

export function useAssistedApplyEvents(jobApplicationId: string | undefined) {
  return useQuery({
    enabled: hasAuthSession() && Boolean(jobApplicationId),
    queryFn: () => autoApplyService.listAuditEvents(jobApplicationId),
    queryKey: autoApplyQueryKeys.events(jobApplicationId),
    staleTime: 15_000,
  });
}
