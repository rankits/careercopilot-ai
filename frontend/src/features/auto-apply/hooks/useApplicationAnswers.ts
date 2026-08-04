import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { autoApplyQueryKeys } from '../queryKeys';
import { autoApplyService } from '../services/autoApply.service';
import type { CreateAnswerPayload } from '../types/autoApply.types';
import { normalizeAutoApplyError } from '../utils/apiError';

export function useApplicationAnswers() {
  return useQuery({
    enabled: hasAuthSession(),
    queryFn: () => autoApplyService.listAnswers(),
    queryKey: autoApplyQueryKeys.answers,
    staleTime: 30_000,
  });
}

export function useCreateApplicationAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAnswerPayload) => {
      try {
        return await autoApplyService.createAnswer(payload);
      } catch (error) {
        throw normalizeAutoApplyError(error, 'Unable to save this answer.');
      }
    },
    mutationKey: ['auto-apply', 'answers', 'create'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.answers });
    },
  });
}

export function useDeleteApplicationAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => autoApplyService.deleteAnswer(id),
    mutationKey: ['auto-apply', 'answers', 'delete'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.answers });
    },
  });
}
