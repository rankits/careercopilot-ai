import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import { normalizeAutoApplyError } from '../utils/apiError';

export function useResumeAnalysis(
  jobApplicationId: string | undefined,
  options?: { forceRefresh?: boolean; enabled?: boolean },
) {
  return useQuery({
    enabled: hasAuthSession() && Boolean(jobApplicationId) && options?.enabled !== false,
    queryFn: () =>
      autoApplyService.analyzeResumeForApplication(jobApplicationId!, {
        forceRefresh: options?.forceRefresh === true,
      }),
    queryKey: [
      ...autoApplyQueryKeys.resumeAnalysis(jobApplicationId ?? ''),
      options?.forceRefresh === true ? 'force' : 'cache',
    ],
    staleTime: 60_000,
    retry: false,
  });
}

export function useUpdateResumeSelection(jobApplicationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resumeVersionId: string) => {
      try {
        return await autoApplyService.updateResumeSelection(jobApplicationId!, resumeVersionId);
      } catch (error) {
        throw normalizeAutoApplyError(error, 'Could not save resume selection.');
      }
    },
    onSuccess: async () => {
      if (!jobApplicationId) return;
      await queryClient.invalidateQueries({
        queryKey: autoApplyQueryKeys.workspace(jobApplicationId),
      });
      await queryClient.invalidateQueries({
        queryKey: autoApplyQueryKeys.resumeAnalysis(jobApplicationId),
      });
    },
  });
}

export function useHandoffApplication(jobApplicationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        return await autoApplyService.handoffApplication(jobApplicationId!);
      } catch (error) {
        throw normalizeAutoApplyError(error, 'Could not open the application page.');
      }
    },
    onSuccess: async () => {
      if (!jobApplicationId) return;
      await queryClient.invalidateQueries({
        queryKey: autoApplyQueryKeys.workspace(jobApplicationId),
      });
      await queryClient.invalidateQueries({
        queryKey: autoApplyQueryKeys.events(jobApplicationId),
      });
    },
  });
}
