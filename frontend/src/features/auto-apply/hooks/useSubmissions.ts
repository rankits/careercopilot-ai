import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import { normalizeAutoApplyError } from '../utils/apiError';

export function useSubmissions() {
  return useQuery({
    enabled: hasAuthSession(),
    queryFn: () => autoApplyService.listSubmissions(),
    queryKey: autoApplyQueryKeys.submissions,
    staleTime: 15_000,
  });
}

export function useInitiateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      try {
        return await autoApplyService.initiateSubmission(jobId);
      } catch (error) {
        throw normalizeAutoApplyError(error, 'Unable to start tracking this job.');
      }
    },
    mutationKey: ['auto-apply', 'submissions', 'initiate'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.submissions });
    },
  });
}

export function useWithdrawSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => autoApplyService.withdrawSubmission(id),
    mutationKey: ['auto-apply', 'submissions', 'withdraw'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.submissions });
    },
  });
}

export function useDeleteSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await autoApplyService.deleteSubmission(id);
      } catch (error) {
        throw normalizeAutoApplyError(error, 'Unable to delete this submission.');
      }
    },
    mutationKey: ['auto-apply', 'submissions', 'delete'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.submissions });
    },
  });
}

export function useReopenSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        return await autoApplyService.reopenSubmission(id);
      } catch (error) {
        throw normalizeAutoApplyError(error, 'Unable to reopen this submission.');
      }
    },
    mutationKey: ['auto-apply', 'submissions', 'reopen'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.submissions });
    },
  });
}

export function useApproveSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        return await autoApplyService.approveSubmission(id);
      } catch (error) {
        throw normalizeAutoApplyError(error, 'Unable to approve this submission.');
      }
    },
    mutationKey: ['auto-apply', 'submissions', 'approve'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.submissions });
    },
  });
}

export function useQueueSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => autoApplyService.queueSubmission(id),
    mutationKey: ['auto-apply', 'submissions', 'queue'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.submissions });
    },
  });
}

export function useConfirmSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => autoApplyService.confirmSubmission(id),
    mutationKey: ['auto-apply', 'submissions', 'confirm'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.submissions });
    },
  });
}

export function useRetrySubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        return await autoApplyService.retrySubmission(id);
      } catch (error) {
        throw normalizeAutoApplyError(error, 'Unable to retry this submission.');
      }
    },
    mutationKey: ['auto-apply', 'submissions', 'retry'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.submissions });
    },
  });
}
