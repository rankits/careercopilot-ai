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

export const similarJobsQueryKey = (jobId: string, limit: number) =>
  ['recommendations', 'similar', jobId, limit] as const;

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
  return {
    ...card,
    recommendationId: rec.id,
    match: match ?? undefined,
    matchSubtitle: formatRecommendationCardSubtitle(rec.category, rec.matchType),
    isRecommended: true,
  };
};

export function useSimilarJobs(
  jobId: string | undefined,
  options: { enabled?: boolean; limit?: number } = {},
) {
  const limit = options.limit ?? 10;

  return useQuery({
    enabled: Boolean(jobId) && (options.enabled ?? true),
    queryKey: similarJobsQueryKey(jobId ?? 'missing', limit),
    queryFn: ({ signal }) => recommendationsService.getSimilarJobs(jobId!, { limit }, { signal }),
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

export function useGenerateResumeRecommendations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resumeId: string) => recommendationsService.generateFromResume(resumeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}

export function useRecommendationFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      recommendationId,
      action,
    }: {
      recommendationId: string;
      action: RecommendationFeedbackAction;
    }) => recommendationsService.submitFeedback(recommendationId, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recommendations', 'list'] });
    },
  });
}
