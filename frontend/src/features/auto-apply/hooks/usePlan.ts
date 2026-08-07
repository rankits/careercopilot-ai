import { useMutation, useQueryClient } from '@tanstack/react-query';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import type { ApplicationPlanResult, JobApplicationStatus } from '../types/autoApply.types';
import { isAutoApplyClientError, normalizeAutoApplyError } from '../utils/apiError';

const NEEDS_FRESH_PLAN: JobApplicationStatus[] = [
  'DISCOVERED',
  'MATCHED',
  'NOT_ELIGIBLE',
  'APPLICATION_PLANNING',
  'INFORMATION_REQUIRED',
];

/** Load review details: create plan when early-stage, otherwise read stored plan. */
export async function loadSubmissionReview(
  jobId: string,
  status: JobApplicationStatus,
): Promise<ApplicationPlanResult | null> {
  if (NEEDS_FRESH_PLAN.includes(status)) {
    try {
      return await autoApplyService.createPlan(jobId);
    } catch (error) {
      const normalized = normalizeAutoApplyError(
        error,
        'Unable to prepare this application review.',
      );
      if (isAutoApplyClientError(normalized) && normalized.code === 'PLAN_REGRESSION_UNSUPPORTED') {
        return autoApplyService.getPlan(jobId);
      }
      throw normalized;
    }
  }

  const existing = await autoApplyService.getPlan(jobId);
  if (existing) return existing;

  try {
    return await autoApplyService.createPlan(jobId);
  } catch (error) {
    const normalized = normalizeAutoApplyError(error, 'Unable to prepare this application review.');
    if (isAutoApplyClientError(normalized) && normalized.code === 'PLAN_REGRESSION_UNSUPPORTED') {
      return null;
    }
    throw normalized;
  }
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      try {
        return await autoApplyService.createPlan(jobId);
      } catch (error) {
        throw normalizeAutoApplyError(error, 'Unable to prepare this application review.');
      }
    },
    mutationKey: ['auto-apply', 'plan', 'create'],
    onSuccess: async (_result, jobId) => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.plan(jobId) });
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.submissions });
    },
  });
}
