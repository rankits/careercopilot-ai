import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import type { CreateResumeVersionPayload } from '../types/autoApply.types';

export function useResumeVersions() {
  return useQuery({
    enabled: hasAuthSession(),
    queryFn: () => autoApplyService.listResumeVersions(),
    queryKey: autoApplyQueryKeys.resumeVersions,
    staleTime: 30_000,
  });
}

export function useCreateResumeVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateResumeVersionPayload) =>
      autoApplyService.createResumeVersion(payload),
    mutationKey: ['auto-apply', 'resume-versions', 'create'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.resumeVersions });
    },
  });
}

export function useDeleteResumeVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => autoApplyService.deleteResumeVersion(id),
    mutationKey: ['auto-apply', 'resume-versions', 'delete'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.resumeVersions });
    },
  });
}
