import type { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import type { BuildRecommendationContextInput } from '@/modules/recommendations/types/recommendations.types.js';
import type {
  CreateRecommendationFromTextInput,
  CreateRecommendationInput,
} from '@/modules/recommendations/validations/recommendation.schema.js';

/**
 * Loads and authorizes source payloads for recommendation generation.
 * Unsupported domain sources remain 501 until their modules exist.
 */
export class RecommendationSourceAuthorizationService {
  constructor(private readonly jobs: IJobSearchRepository) {}

  async authorizeForSource(
    userId: string,
    input: CreateRecommendationInput,
  ): Promise<BuildRecommendationContextInput> {
    switch (input.sourceType) {
      case 'JOB': {
        if (!input.sourceId) {
          throw new RecommendationError(
            'sourceId is required for JOB recommendations',
            422,
            RECOMMENDATION_ERROR_CODES.CONTEXT_INVALID,
          );
        }
        const job = await this.jobs.findById(input.sourceId);
        if (!job) {
          throw new RecommendationError(
            'Recommendation source job was not found',
            404,
            RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
          );
        }
        return {
          userId,
          sourceType: 'JOB',
          sourceId: input.sourceId,
          authorizedSourcePayload: job,
        };
      }
      case 'PROFILE':
      case 'RESUME':
        throw new RecommendationError(
          `${input.sourceType} authorization requires owned candidate/resume payload mapping before generation can run`,
          501,
          RECOMMENDATION_ERROR_CODES.NOT_IMPLEMENTED,
        );
      case 'CAREER_GOAL':
      case 'SAVED_SEARCH':
        throw new RecommendationError(
          `${input.sourceType} authorization is not available until its domain models exist`,
          501,
          RECOMMENDATION_ERROR_CODES.NOT_IMPLEMENTED,
        );
      default: {
        const exhaustive: never = input.sourceType;
        throw new RecommendationError(
          `Unsupported recommendation source type: ${String(exhaustive)}`,
          400,
          RECOMMENDATION_ERROR_CODES.SOURCE_NOT_SUPPORTED,
        );
      }
    }
  }

  authorizeFromText(
    userId: string,
    input: CreateRecommendationFromTextInput,
  ): BuildRecommendationContextInput {
    const targetText = input.targetText.trim();
    if (!targetText) {
      throw new RecommendationError(
        'Target text is required',
        422,
        RECOMMENDATION_ERROR_CODES.TARGET_TEXT_REQUIRED,
      );
    }
    return {
      userId,
      sourceType: 'TARGET_TEXT',
      authorizedSourcePayload: targetText,
    };
  }
}
