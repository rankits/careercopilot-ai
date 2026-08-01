import type { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import type { RecommendationSourceLoader } from '@/modules/recommendations/contracts/recommendation-source-loader.js';
import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import {
  hasRecommendationSignal,
  toCandidateProfileSourcePayload,
} from '@/modules/recommendations/mappers/candidate-profile-source.mapper.js';
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
  constructor(
    private readonly jobs: IJobSearchRepository,
    private readonly profiles: RecommendationSourceLoader,
  ) {}

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
      case 'PROFILE': {
        const profile = await this.profiles.findCandidateProfileByUserId(userId);
        if (!profile) {
          throw new RecommendationError(
            'Candidate profile was not found for this user',
            404,
            RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
          );
        }
        const payload = toCandidateProfileSourcePayload(profile);
        if (!hasRecommendationSignal(payload)) {
          throw new RecommendationError(
            'Candidate profile does not contain titles, skills, or summary text for recommendations',
            422,
            RECOMMENDATION_ERROR_CODES.CONTEXT_INVALID,
          );
        }
        return {
          userId,
          sourceType: 'PROFILE',
          authorizedSourcePayload: payload,
        };
      }
      case 'RESUME': {
        if (!input.sourceId) {
          throw new RecommendationError(
            'sourceId is required for RESUME recommendations',
            422,
            RECOMMENDATION_ERROR_CODES.CONTEXT_INVALID,
          );
        }
        const parsed = await this.profiles.findOwnedResumeProfileSource(userId, input.sourceId);
        if (!parsed) {
          throw new RecommendationError(
            'Owned resume with completed parse data was not found',
            404,
            RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
          );
        }
        const payload = toCandidateProfileSourcePayload(parsed);
        if (!hasRecommendationSignal(payload)) {
          throw new RecommendationError(
            'Resume parse data does not contain titles, skills, or summary text for recommendations',
            422,
            RECOMMENDATION_ERROR_CODES.CONTEXT_INVALID,
          );
        }
        return {
          userId,
          sourceType: 'RESUME',
          sourceId: input.sourceId,
          authorizedSourcePayload: payload,
        };
      }
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
