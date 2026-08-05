import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import type { PrivacyAcknowledgementPayload } from '../types/autoApply.types';

export function usePrivacyAcknowledgement() {
  return useQuery({
    enabled: hasAuthSession(),
    queryFn: () => autoApplyService.getPrivacyAcknowledgement(),
    queryKey: autoApplyQueryKeys.privacyAcknowledgement,
    staleTime: 30_000,
  });
}

export function useSavePrivacyAcknowledgement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PrivacyAcknowledgementPayload) =>
      autoApplyService.savePrivacyAcknowledgement(payload),
    mutationKey: ['auto-apply', 'privacy-acknowledgement', 'save'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.privacyAcknowledgement });
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.setupStatus });
    },
  });
}
