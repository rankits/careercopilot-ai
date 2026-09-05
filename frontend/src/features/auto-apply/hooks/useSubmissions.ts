import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import { handleAutoApplyMutationError } from '../utils/mutationError';

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
        throw handleAutoApplyMutationError(
          error,
          'Unable to start tracking this job.',
          queryClient,
        );
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
    mutationFn: async (id: string) => {
      try {
        return await autoApplyService.withdrawSubmission(id);
      } catch (error) {
        throw handleAutoApplyMutationError(
          error,
          'Unable to withdraw this submission.',
          queryClient,
        );
      }
    },
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
        throw handleAutoApplyMutationError(error, 'Unable to delete this submission.', queryClient);
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
        throw handleAutoApplyMutationError(error, 'Unable to reopen this submission.', queryClient);
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
        throw handleAutoApplyMutationError(
          error,
          'Unable to approve this submission.',
          queryClient,
        );
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
    mutationFn: async (id: string) => {
      try {
        return await autoApplyService.queueSubmission(id);
      } catch (error) {
        throw handleAutoApplyMutationError(error, 'Unable to queue this submission.', queryClient);
      }
    },
    mutationKey: ['auto-apply', 'submissions', 'queue'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.submissions });
    },
  });
}

export function useConfirmSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        return await autoApplyService.confirmSubmission(id);
      } catch (error) {
        throw handleAutoApplyMutationError(
          error,
          'Unable to confirm this submission.',
          queryClient,
        );
      }
    },
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
        throw handleAutoApplyMutationError(error, 'Unable to retry this submission.', queryClient);
      }
    },
    mutationKey: ['auto-apply', 'submissions', 'retry'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.submissions });
    },
  });
}
