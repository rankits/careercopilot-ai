import { useQuery } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import type { ApplicationReadinessStage } from '../types/autoApply.types';

export function useApplicationReadiness(
  jobId: string | undefined,
  stage: ApplicationReadinessStage,
  jobApplicationId?: string,
) {
  return useQuery({
    enabled: hasAuthSession() && Boolean(jobId),
    queryFn: () =>
      autoApplyService.getApplicationReadiness(jobId!, {
        stage,
        jobApplicationId,
      }),
    queryKey: autoApplyQueryKeys.readiness(jobId ?? '', stage),
    staleTime: 15_000,
  });
}
