import type { RecommendationStrategyResolver } from '@/modules/recommendations/strategies/recommendation-strategy.resolver.js';
import type {
  BuildRecommendationContextInput,
  RecommendationContext,
} from '@/modules/recommendations/types/recommendations.types.js';

export class RecommendationContextService {
  constructor(private readonly strategyResolver: RecommendationStrategyResolver) {}

  async build(input: BuildRecommendationContextInput): Promise<RecommendationContext> {
    const strategy = this.strategyResolver.resolve(input.sourceType);
    return strategy.buildContext(input);
  }
}
