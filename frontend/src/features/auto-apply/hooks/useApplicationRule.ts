import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import type { UpsertRulePayload } from '../types/autoApply.types';

export function useApplicationRule() {
  return useQuery({
    enabled: hasAuthSession(),
    queryFn: () => autoApplyService.getRule(),
    queryKey: autoApplyQueryKeys.rule,
    staleTime: 30_000,
  });
}

export function useUpsertApplicationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertRulePayload) => autoApplyService.upsertRule(payload),
    mutationKey: ['auto-apply', 'rule', 'upsert'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.rule });
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.setupStatus });
    },
  });
}

export function useToggleAutopilotPause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pause: boolean) =>
      pause ? autoApplyService.pauseAutopilot() : autoApplyService.resumeAutopilot(),
    mutationKey: ['auto-apply', 'rule', 'toggle-pause'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.rule });
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.setupStatus });
    },
  });
}
