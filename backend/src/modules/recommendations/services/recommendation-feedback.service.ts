import type { RecommendationFeedbackRepository } from '@/modules/recommendations/contracts/recommendation.repository.js';
import { recordFeedbackAction } from '@/modules/recommendations/observability/recommendation.metrics.js';
import type {
  RecommendationFeedbackAction,
  RecommendationFeedbackRecord,
} from '@/modules/recommendations/types/recommendations.types.js';

export class RecommendationFeedbackService {
  constructor(private readonly repository: RecommendationFeedbackRepository) {}

  store(input: {
    userId: string;
    recommendationId: string;
    jobId: string;
    action: RecommendationFeedbackAction;
    note?: string;
  }): Promise<RecommendationFeedbackRecord> {
    recordFeedbackAction(input.action);
    return this.repository.upsert(input);
  }

  findForRecommendation(
    userId: string,
    recommendationId: string,
  ): Promise<RecommendationFeedbackRecord | null> {
    return this.repository.findByRecommendation(userId, recommendationId);
  }
}
