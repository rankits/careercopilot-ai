import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aiMailQueryKeys } from '../queryKeys';
import { aiMailService } from '../services/aiMail.service';
import type {
  AiMailGenerationPayload,
  AiMailRewritePayload,
  VersionedDraftPayload,
} from '../types/aiMail.types';
import { normalizeAiMailError } from '../utils/apiError';

async function invalidateGenerationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  draftId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: aiMailQueryKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: aiMailQueryKeys.detail(draftId) }),
    queryClient.invalidateQueries({ queryKey: aiMailQueryKeys.readiness(draftId) }),
    queryClient.invalidateQueries({ queryKey: aiMailQueryKeys.revisions(draftId) }),
  ]);
}

export function useAiMailDraftRevisions(draftId: string | null) {
  return useQuery({
    queryKey: aiMailQueryKeys.revisions(draftId ?? 'none'),
    queryFn: async () => {
      try {
        return await aiMailService.listRevisions(draftId!);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to load draft revision history.');
      }
    },
    enabled: Boolean(draftId),
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });
}

export function useGenerateAiMailDraft(draftId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AiMailGenerationPayload) => {
      if (!draftId) throw new Error('Select a draft before generating.');
      try {
        return await aiMailService.generateDraft(draftId, payload);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to generate the AI Mail draft.');
      }
    },
    onSuccess: async () => {
      if (draftId) await invalidateGenerationQueries(queryClient, draftId);
    },
  });
}

export function useRegenerateAiMailDraft(draftId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AiMailGenerationPayload) => {
      if (!draftId) throw new Error('Select a draft before regenerating.');
      try {
        return await aiMailService.regenerateDraft(draftId, payload);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to regenerate the AI Mail draft.');
      }
    },
    onSuccess: async () => {
      if (draftId) await invalidateGenerationQueries(queryClient, draftId);
    },
  });
}

export function useRewriteAiMailDraft(draftId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AiMailRewritePayload) => {
      if (!draftId) throw new Error('Select a draft before rewriting.');
      try {
        return await aiMailService.rewriteDraft(draftId, payload);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to rewrite the AI Mail draft.');
      }
    },
    onSuccess: async () => {
      if (draftId) await invalidateGenerationQueries(queryClient, draftId);
    },
  });
}

export function useGenerateAiMailSubject(draftId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AiMailGenerationPayload) => {
      if (!draftId) throw new Error('Select a draft before generating a subject.');
      try {
        return await aiMailService.generateSubject(draftId, payload);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to generate the AI Mail subject.');
      }
    },
    onSuccess: async () => {
      if (draftId) await invalidateGenerationQueries(queryClient, draftId);
    },
  });
}

export function useRestoreAiMailDraftRevision(draftId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ revisionId, version }: VersionedDraftPayload & { revisionId: string }) => {
      if (!draftId) throw new Error('Select a draft before restoring a revision.');
      try {
        return await aiMailService.restoreRevision(draftId, revisionId, { version });
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to restore the draft revision.');
      }
    },
    onSuccess: async () => {
      if (draftId) await invalidateGenerationQueries(queryClient, draftId);
    },
  });
}
