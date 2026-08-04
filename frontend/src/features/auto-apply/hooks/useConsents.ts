import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import type { ConsentType } from '../types/autoApply.types';

export function useConsents() {
  return useQuery({
    enabled: hasAuthSession(),
    queryFn: () => autoApplyService.listConsents(),
    queryKey: autoApplyQueryKeys.consents,
    staleTime: 30_000,
  });
}

export function useGrantConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (consentType: ConsentType) => autoApplyService.grantConsent(consentType),
    mutationKey: ['auto-apply', 'consents', 'grant'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.consents });
    },
  });
}

export function useRevokeConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => autoApplyService.revokeConsent(id),
    mutationKey: ['auto-apply', 'consents', 'revoke'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.consents });
    },
  });
}
