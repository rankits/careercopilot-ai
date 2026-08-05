import { useQuery } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';
import { httpClient } from '@/services/httpClient';
import type { BackendSuccessResponse } from '@/features/auto-apply/types/autoApply.types';

export interface AssistedApplyRolloutFlags {
  workspace: boolean;
  directHandoff: boolean;
}

/**
 * AA-092 — server-evaluated cohort flags (percent + allowlist).
 * Falls back to Vite kill switches when the endpoint is unavailable.
 */
export function useAssistedApplyRolloutFlags() {
  return useQuery({
    enabled: hasAuthSession(),
    queryKey: ['auto-apply', 'rollout-flags'],
    staleTime: 60_000,
    queryFn: async (): Promise<AssistedApplyRolloutFlags> => {
      const { data } = await httpClient.get<
        BackendSuccessResponse<AssistedApplyRolloutFlags & { rollout?: unknown }>
      >('/auto-apply/rollout-flags');
      const payload = data.data;
      return {
        workspace: payload?.workspace !== false,
        directHandoff: payload?.directHandoff !== false,
      };
    },
  });
}

export function isWorkspaceEnabledClient(
  rollout: AssistedApplyRolloutFlags | undefined,
): boolean {
  if (import.meta.env.VITE_ASSISTED_APPLY_WORKSPACE === 'false') return false;
  if (rollout && rollout.workspace === false) return false;
  return true;
}
