import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import type { WorkspaceStepId } from '../types/autoApply.types';

export function useAssistedApplyWorkspace(jobApplicationId: string | undefined) {
  return useQuery({
    enabled: hasAuthSession() && Boolean(jobApplicationId),
    queryFn: () => autoApplyService.getAssistedApplyWorkspace(jobApplicationId!),
    queryKey: autoApplyQueryKeys.workspace(jobApplicationId ?? ''),
    staleTime: 15_000,
  });
}

export function useUpdateWorkspaceProgressStep(jobApplicationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (progressStep: WorkspaceStepId) =>
      autoApplyService.updateWorkspaceProgressStep(jobApplicationId!, progressStep),
    mutationKey: ['auto-apply', 'workspace', 'progress-step', jobApplicationId],
    onSuccess: async () => {
      if (!jobApplicationId) return;
      await queryClient.invalidateQueries({
        queryKey: autoApplyQueryKeys.workspace(jobApplicationId),
      });
    },
  });
}
