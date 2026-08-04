import { useMutation, useQueryClient } from '@tanstack/react-query';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import { normalizeAutoApplyError } from '../utils/apiError';

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      try {
        return await autoApplyService.createPlan(jobId);
      } catch (error) {
        throw normalizeAutoApplyError(error, 'Unable to generate a plan for this job.');
      }
    },
    mutationKey: ['auto-apply', 'plan', 'create'],
    onSuccess: async (_result, jobId) => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.plan(jobId) });
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.submissions });
    },
  });
}
