import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { recommendationsService } from '@/features/recommendations/services/recommendations.service';
import type { ListRecommendationsParams } from '@/features/recommendations/types/recommendation.types';
import { formatRecommendationScorePercent } from '@/features/jobs/utils/formatRecommendationScore';
import { mapJobListDtoToCard } from '@/features/jobs/utils/mapJobToCard';

export const recommendationsQueryKey = (params: ListRecommendationsParams) =>
  ['recommendations', 'list', params] as const;

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
          const match = formatRecommendationScorePercent(rec.scoreResult?.overallScore);
          return {
            ...card,
            match: match ?? undefined,
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
      await queryClient.invalidateQueries({ queryKey: ['recommendations', 'list'] });
    },
  });
}
