import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { formatRecommendationScorePercent } from '@/features/jobs/utils/formatRecommendationScore';
import { mapJobListDtoToCard } from '@/features/jobs/utils/mapJobToCard';
import { recommendationsService } from '@/features/recommendations/services/recommendations.service';
import type {
  ListRecommendationsParams,
  RecommendationDto,
  RecommendationFeedbackAction,
} from '@/features/recommendations/types/recommendation.types';
import { formatRecommendationCardSubtitle } from '@/features/recommendations/utils/formatRecommendationMatchLabel';

export const recommendationsQueryKey = (params: ListRecommendationsParams) =>
  ['recommendations', 'list', params] as const;

export const recommendationsReadinessQueryKey = ['recommendations', 'readiness'] as const;

export const similarJobsQueryKey = (jobId: string, limit?: number) =>
  ['recommendations', 'similar', jobId, limit ?? 'default'] as const;

export const savedSearchesQueryKey = ['recommendations', 'saved-searches'] as const;

export function useRecommendationReadiness() {
  return useQuery({
    queryKey: recommendationsReadinessQueryKey,
    queryFn: ({ signal }) => recommendationsService.getReadiness({ signal }),
    staleTime: 30_000,
  });
}

export function useRecommendations(
  params: ListRecommendationsParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryKey: recommendationsQueryKey(params),
    queryFn: ({ signal }) => recommendationsService.list(params, { signal }),
    select: (result) => {
      const totalPages = Math.max(1, Math.ceil(result.total / Math.max(1, result.limit)));
      return {
        ...result,
        totalPages,
        hasNextPage: result.page < totalPages,
        hasPreviousPage: result.page > 1,
        cards: result.items.map(mapRecommendationDtoToCard),
      };
    },
  });
}

export const mapRecommendationDtoToCard = (rec: RecommendationDto, index = 0) => {
  const card = mapJobListDtoToCard(rec.job, index);
  const match = formatRecommendationScorePercent({
    displayScore: rec.displayScore,
    overallScore: rec.scoreResult?.overallScore,
  });
  const bullets =
    rec.explanation?.bullets.map((bullet) => ({
      label: bullet.label,
      score: bullet.score,
      message: bullet.message,
      evidence: bullet.evidence,
    })) ?? [];
  const recommendationDetails =
    rec.explanation || rec.skillGap
      ? {
          summary: rec.explanation?.summary,
          bullets,
          skillGap: rec.skillGap,
        }
      : undefined;
  return {
    ...card,
    recommendationId: rec.id,
    recommendationDetails,
    match: match ?? undefined,
    matchSubtitle: formatRecommendationCardSubtitle(rec.category, rec.matchType),
    isRecommended: true,
  };
};

export function useSimilarJobs(
  jobId: string | undefined,
  options: { enabled?: boolean; limit?: number } = {},
) {
  const limit = options.limit;

  return useQuery({
    enabled: Boolean(jobId) && (options.enabled ?? true),
    queryKey: similarJobsQueryKey(jobId ?? 'missing', limit),
    queryFn: ({ signal }) =>
      recommendationsService.getSimilarJobs(jobId!, limit !== undefined ? { limit } : {}, {
        signal,
      }),
    // Similar-job retrieval is expensive; avoid automatic multi-retries on failure.
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    select: (items) => {
      const filteredItems = items.filter((item) => item.job.id !== jobId);
      return {
        items: filteredItems,
        cards: filteredItems.map((item, index) => {
          const card = mapJobListDtoToCard(item.job, index);
          const match = formatRecommendationScorePercent({
            displayScore: item.displayScore,
            overallScore: item.scoreResult?.overallScore,
          });
          return {
            ...card,
            match: match ?? undefined,
            matchSubtitle: formatRecommendationCardSubtitle(item.category, item.matchType),
            isRecommended: true,
          };
        }),
      };
    },
  });
}

export function useGenerateRecommendations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => recommendationsService.generateFromProfile(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}

export function useRefreshProfileRecommendations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => recommendationsService.refreshFromProfile(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}

export function useGenerateResumeRecommendations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resumeId: string) => recommendationsService.generateFromResume(resumeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}

export function useGenerateTextRecommendations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetText: string) => recommendationsService.generateFromText(targetText),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}

export function useGenerateCareerGoalRecommendations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { goalText: string; structured?: Record<string, unknown> }) => {
      const target = await recommendationsService.createCareerTarget(input);
      return recommendationsService.generateFromCareerGoal(target.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}

export function useSavedSearches(options: { enabled?: boolean } = {}) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryKey: savedSearchesQueryKey,
    queryFn: ({ signal }) => recommendationsService.listSavedSearches({}, { signal }),
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; query?: string }) =>
      recommendationsService.createSavedSearch(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedSearchesQueryKey });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (savedSearchId: string) => recommendationsService.deleteSavedSearch(savedSearchId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedSearchesQueryKey });
    },
  });
}

export function useGenerateSavedSearchRecommendations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (savedSearchId: string) =>
      recommendationsService.generateFromSavedSearch(savedSearchId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}

export function useRecommendationFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: ({
      recommendationId,
      action,
    }: {
      recommendationId: string;
      action: RecommendationFeedbackAction;
    }) => recommendationsService.submitFeedback(recommendationId, action),
    onSuccess: async (_data, variables) => {
      if (variables.action === 'VIEWED' || variables.action === 'OPENED') return;
      await queryClient.invalidateQueries({ queryKey: ['recommendations', 'list'] });
    },
  });
}
