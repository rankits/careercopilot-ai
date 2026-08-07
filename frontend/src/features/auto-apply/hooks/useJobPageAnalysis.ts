import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import type { ApplicationPageAnalysisDto } from '../types/autoApply.types';
import { normalizeAutoApplyError } from '../utils/apiError';

export function useLatestJobAnalysis(jobId: string | undefined) {
  return useQuery({
    enabled: hasAuthSession() && Boolean(jobId),
    queryFn: () => autoApplyService.getLatestJobAnalysis(jobId!),
    queryKey: autoApplyQueryKeys.analysis(jobId ?? ''),
    staleTime: 60_000,
  });
}

export function useAnalyzeJobPage(jobId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: { forceRefresh?: boolean }) => {
      try {
        return await autoApplyService.analyzeJobPage(jobId!, {
          forceRefresh: options?.forceRefresh === true,
        });
      } catch (error) {
        throw normalizeAutoApplyError(error, 'We could not analyze this job posting.');
      }
    },
    mutationKey: ['auto-apply', 'analyze', jobId],
    onSuccess: async (analysis: ApplicationPageAnalysisDto) => {
      if (!jobId) return;
      queryClient.setQueryData(autoApplyQueryKeys.analysis(jobId), analysis);
      await queryClient.invalidateQueries({ queryKey: ['auto-apply', 'workspace'] });
    },
  });
}
