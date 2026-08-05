import { useMutation, useQueryClient } from '@tanstack/react-query';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import type { PrepareApplicationPayload, PrepareApplicationResult } from '../types/autoApply.types';
import { normalizeAutoApplyError } from '../utils/apiError';

export function usePrepareApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      ...payload
    }: PrepareApplicationPayload & { jobId: string }): Promise<PrepareApplicationResult> => {
      try {
        return await autoApplyService.prepareApplication(jobId, payload);
      } catch (error) {
        throw normalizeAutoApplyError(error, 'Unable to prepare this application.');
      }
    },
    mutationKey: ['auto-apply', 'prepare'],
    onSuccess: async (result, variables) => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.plan(variables.jobId) });
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.submissions });
      if (result.analysis?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['auto-apply', 'analysis', variables.jobId],
        });
      }
    },
  });
}
