import type { QueryClient } from '@tanstack/react-query';

import { autoApplyQueryKeys } from '../queryKeys';

import { isStatusConflictError, normalizeAutoApplyError } from './apiError';

/**
 * Shared mutation error path (AA-010): normalize the error, and on a stale-status
 * conflict invalidate submission queries so the UI refreshes current state.
 */
export function handleAutoApplyMutationError(
  error: unknown,
  fallbackMessage: string,
  queryClient: QueryClient,
): Error {
  const normalized = normalizeAutoApplyError(error, fallbackMessage);
  if (isStatusConflictError(normalized)) {
    void queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.submissions });
  }
  return normalized;
}
