import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aiMailQueryKeys } from '../queryKeys';
import { aiMailService } from '../services/aiMail.service';
import type {
  AiMailDraftListParams,
  AiMailDeliveryListParams,
  AiMailSendPayload,
  CreateAiMailDraftPayload,
  PrepareFollowUpPayload,
  UpdateAiMailDraftPayload,
  VersionedDraftPayload,
} from '../types/aiMail.types';
import { normalizeAiMailError } from '../utils/apiError';

async function invalidateDraftQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  draftId?: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: aiMailQueryKeys.lists() }),
    queryClient.invalidateQueries({
      queryKey: draftId ? aiMailQueryKeys.detail(draftId) : aiMailQueryKeys.details(),
    }),
    draftId
      ? queryClient.invalidateQueries({ queryKey: aiMailQueryKeys.readiness(draftId) })
      : Promise.resolve(),
  ]);
}

export function useAiMailConfig() {
  return useQuery({
    queryKey: aiMailQueryKeys.config(),
    queryFn: async () => {
      try {
        return await aiMailService.getConfig();
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to load AI Mail configuration.');
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}

export function useAiMailResumes() {
  return useQuery({
    queryKey: aiMailQueryKeys.resumes(),
    queryFn: async () => {
      try {
        return await aiMailService.listResumes();
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to load AI Mail resumes.');
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

export function useAiMailProfileSummary() {
  return useQuery({
    queryKey: aiMailQueryKeys.profileSummary(),
    queryFn: async () => {
      try {
        return await aiMailService.getProfileSummary();
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to load candidate profile summary.');
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

export function useAiMailGenerationReadiness(draftId: string | null) {
  return useQuery({
    queryKey: aiMailQueryKeys.readiness(draftId ?? 'none'),
    queryFn: async () => {
      try {
        return await aiMailService.getGenerationReadiness(draftId!);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to evaluate generation readiness.');
      }
    },
    enabled: Boolean(draftId),
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });
}

export function useAiMailDrafts(params: AiMailDraftListParams) {
  return useQuery({
    queryKey: aiMailQueryKeys.list(params),
    queryFn: async () => {
      try {
        return await aiMailService.listDrafts(params);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to load AI Mail drafts.');
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

export function useAiMailDraft(draftId: string | null) {
  return useQuery({
    queryKey: aiMailQueryKeys.detail(draftId ?? 'none'),
    queryFn: async () => {
      try {
        return await aiMailService.getDraft(draftId!);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to load this AI Mail draft.');
      }
    },
    enabled: Boolean(draftId),
    refetchOnWindowFocus: false,
  });
}

export function useCreateAiMailDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAiMailDraftPayload) => {
      try {
        return await aiMailService.createDraft(payload);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to create the AI Mail draft.');
      }
    },
    onSuccess: async (draft) => invalidateDraftQueries(queryClient, draft.id),
  });
}

export function useUpdateAiMailDraft(draftId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateAiMailDraftPayload) => {
      if (!draftId) throw new Error('Select a draft before saving.');
      try {
        return await aiMailService.updateDraft(draftId, payload);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to save the AI Mail draft.');
      }
    },
    onSuccess: async () => {
      if (draftId) await invalidateDraftQueries(queryClient, draftId);
    },
  });
}

export function useArchiveAiMailDraft(draftId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: VersionedDraftPayload) => {
      if (!draftId) throw new Error('Select a draft before archiving.');
      try {
        return await aiMailService.archiveDraft(draftId, payload);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to archive the AI Mail draft.');
      }
    },
    onSuccess: async () => {
      if (draftId) await invalidateDraftQueries(queryClient, draftId);
    },
  });
}

export function useMarkAiMailDraftReady(draftId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: VersionedDraftPayload) => {
      if (!draftId) throw new Error('Select a draft before marking it ready.');
      try {
        return await aiMailService.markReady(draftId, payload);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to mark the AI Mail draft ready.');
      }
    },
    onSuccess: async () => {
      if (draftId) await invalidateDraftQueries(queryClient, draftId);
    },
  });
}

export function useAiMailSendPreview(
  draftId: string | null,
  connectedAccountId: number | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: aiMailQueryKeys.sendPreview(draftId ?? 'none', connectedAccountId ?? 0),
    queryFn: async () => {
      try {
        return await aiMailService.sendPreview(draftId!, connectedAccountId!);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to load send preview.');
      }
    },
    enabled: Boolean(draftId && connectedAccountId && enabled),
    refetchOnWindowFocus: false,
    staleTime: 10_000,
  });
}

export function useSendAiMailDraft(draftId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AiMailSendPayload) => {
      if (!draftId) throw new Error('Select a draft before sending.');
      try {
        return await aiMailService.sendDraft(draftId, payload);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to send the AI Mail draft.');
      }
    },
    onSuccess: async () => {
      if (draftId) await invalidateDraftQueries(queryClient, draftId);
      await queryClient.invalidateQueries({ queryKey: aiMailQueryKeys.deliveries() });
      await queryClient.invalidateQueries({ queryKey: aiMailQueryKeys.sendLimits() });
    },
  });
}

export function useAiMailDeliveries(params: AiMailDeliveryListParams, enabled = true) {
  return useQuery({
    queryKey: aiMailQueryKeys.deliveries(params),
    queryFn: async () => {
      try {
        return await aiMailService.listDeliveries(params);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to load delivery history.');
      }
    },
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });
}

export function useAiMailDraftDeliveries(draftId: string | null, enabled = true) {
  return useQuery({
    queryKey: aiMailQueryKeys.draftDeliveries(draftId ?? 'none'),
    queryFn: async () => {
      try {
        return await aiMailService.listDraftDeliveries(draftId!);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to load draft deliveries.');
      }
    },
    enabled: Boolean(draftId) && enabled,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });
}

export function useAiMailSendLimits(enabled = true) {
  return useQuery({
    queryKey: aiMailQueryKeys.sendLimits(),
    queryFn: async () => {
      try {
        return await aiMailService.getSendLimits();
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to load send limits.');
      }
    },
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

export function useResolveAiMailDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      deliveryId: string;
      resolution: 'confirmed_sent' | 'confirmed_not_sent';
    }) => {
      try {
        return await aiMailService.resolveDeliveryStatus(input.deliveryId, input.resolution);
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to resolve delivery status.');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: aiMailQueryKeys.deliveries() });
    },
  });
}

export function usePrepareAiMailFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { deliveryId: string; payload?: PrepareFollowUpPayload }) => {
      try {
        return await aiMailService.prepareFollowUp(input.deliveryId, input.payload ?? {});
      } catch (error) {
        throw normalizeAiMailError(error, 'Unable to prepare follow-up draft.');
      }
    },
    onSuccess: async (result) => {
      await invalidateDraftQueries(queryClient, result.draft.id);
      await queryClient.invalidateQueries({ queryKey: aiMailQueryKeys.deliveries() });
    },
  });
}
