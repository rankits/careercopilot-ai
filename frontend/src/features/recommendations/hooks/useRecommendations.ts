import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { formatRecommendationScorePercent } from '@/features/jobs/utils/formatRecommendationScore';
import { mapJobListDtoToCard } from '@/features/jobs/utils/mapJobToCard';
import { recommendationsService } from '@/features/recommendations/services/recommendations.service';
import type {
  ListRecommendationsParams,
  RecommendationFeedbackAction,
} from '@/features/recommendations/types/recommendation.types';
import { formatRecommendationCardSubtitle } from '@/features/recommendations/utils/formatRecommendationMatchLabel';

export const recommendationsQueryKey = (params: ListRecommendationsParams) =>
  ['recommendations', 'list', params] as const;

export const recommendationsReadinessQueryKey = ['recommendations', 'readiness'] as const;

export function useRecommendationReadiness() {
  return useQuery({
    queryKey: recommendationsReadinessQueryKey,
    queryFn: ({ signal }) => recommendationsService.getReadiness({ signal }),
    staleTime: 30_000,
  });
}

export function useRecommendations(params: ListRecommendationsParams = {}) {
  return useQuery({
    queryKey: recommendationsQueryKey(params),
    queryFn: ({ signal }) => recommendationsService.list(params, { signal }),
    select: (result) => {
      const totalPages = Math.max(1, Math.ceil(result.total / Math.max(1, result.limit)));
      return {
        ...result,
        totalPages,
        hasNextPage: result.page < totalPages,
        hasPreviousPage: result.page > 1,
        cards: result.items.map((rec, index) => {
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
