import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import type { UpsertCandidateProfilePayload } from '../types/autoApply.types';

export function useCandidateProfile() {
  return useQuery({
    enabled: hasAuthSession(),
    queryFn: () => autoApplyService.getProfile(),
    queryKey: autoApplyQueryKeys.profile,
    staleTime: 30_000,
  });
}

export function useUpsertCandidateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertCandidateProfilePayload) => autoApplyService.upsertProfile(payload),
    mutationKey: ['auto-apply', 'profile', 'upsert'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.profile });
    },
  });
}
