import type { JobFeedPickerJob } from '@/constants/pages/addApplication';
import { formatRecommendationScorePercent } from '@/features/jobs/utils/formatRecommendationScore';
import { mapJobListDtoToCard } from '@/features/jobs/utils/mapJobToCard';
import type { RecommendationDto } from '@/features/recommendations/types/recommendation.types';
import { colorTokens, palette } from '@/tokens';

const pickerAvatarColors = [
  colorTokens.actionPrimary,
  palette.blue600,
  colorTokens.feedbackSuccess,
];

export function mapRecommendationToPickerJob(
  recommendation: RecommendationDto,
  index = 0,
): JobFeedPickerJob {
  const card = mapJobListDtoToCard(recommendation.job, index);
  const match =
    formatRecommendationScorePercent({
      displayScore: recommendation.displayScore,
      overallScore: recommendation.scoreResult?.overallScore,
    }) ?? 0;

  return {
    avatarColor: pickerAvatarColors[index % pickerAvatarColors.length] ?? colorTokens.actionPrimary,
    company: card.company,
    id: recommendation.job.id,
    initials: card.logo,
    location: card.location || 'Location not listed',
    match,
    publishedAt: recommendation.job.publishedAt ?? null,
    title: card.title,
    type: card.type,
  };
}
