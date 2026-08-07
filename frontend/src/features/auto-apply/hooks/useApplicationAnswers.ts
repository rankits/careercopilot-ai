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
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.setupStatus });
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
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.setupStatus });
    },
  });
}

export function useUpsertApplicationAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAnswerPayload) => {
      const answers = await autoApplyService.listAnswers();
      const existing = answers.find((answer) => answer.questionKey === payload.questionKey);
      if (existing) {
        return autoApplyService.updateAnswer(existing.id, {
          answer: payload.answer,
          autoSubmitAllowed: payload.autoSubmitAllowed,
        });
      }
      try {
        return await autoApplyService.createAnswer(payload);
      } catch (error) {
        throw normalizeAutoApplyError(error, 'Unable to save this answer.');
      }
    },
    mutationKey: ['auto-apply', 'answers', 'upsert'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.answers });
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.setupStatus });
    },
  });
}
