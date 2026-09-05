import type {
  BuildRecommendationContextInput,
  CandidateProfileSourcePayload,
  RecommendationContext,
  RecommendationSourceType,
} from '@/modules/recommendations/types/recommendations.types.js';
import { normalizeExtractedRecommendationContext } from '@/modules/recommendations/types/recommendations.types.js';
import {
  RecommendationError,
  RECOMMENDATION_ERROR_CODES,
} from '@/modules/recommendations/errors/recommendation.error.js';
import type { RecommendationExtractionProvider } from '@/modules/recommendations/contracts/recommendation-provider.contracts.js';
import { HeuristicTargetTextExtractionProvider } from '@/modules/recommendations/providers/heuristic-target-text-extraction.provider.js';
import { createChildLogger } from '@/shared/logger/logger.js';

const sourceLogger = createChildLogger({ module: 'recommendation-source' });

export interface RecommendationSourceStrategy {
  supports(sourceType: RecommendationSourceType): boolean;
  buildContext(input: BuildRecommendationContextInput): Promise<RecommendationContext>;
}

const profileContext = (
  userId: string,
  sourceType: 'PROFILE' | 'RESUME' | 'CAREER_GOAL' | 'SAVED_SEARCH',
  payload: CandidateProfileSourcePayload,
  sourceId?: string,
): RecommendationContext => ({
  userId,
  sourceType,
  sourceId,
  ...normalizeExtractedRecommendationContext(payload),
});

abstract class TypedSourceStrategy implements RecommendationSourceStrategy {
  protected abstract readonly sourceType: RecommendationSourceType;
  abstract buildContext(input: BuildRecommendationContextInput): Promise<RecommendationContext>;

  supports(sourceType: RecommendationSourceType): boolean {
    return sourceType === this.sourceType;
  }

  protected rejectWrongSource(): never {
    throw new RecommendationError(
      `The ${this.sourceType} strategy received a different source type`,
      400,
      RECOMMENDATION_ERROR_CODES.SOURCE_NOT_SUPPORTED,
    );
  }
}

export class ProfileSourceStrategy extends TypedSourceStrategy {
  protected readonly sourceType = 'PROFILE' as const;

  async buildContext(input: BuildRecommendationContextInput): Promise<RecommendationContext> {
    if (input.sourceType !== this.sourceType) return this.rejectWrongSource();
    return profileContext(input.userId, this.sourceType, input.authorizedSourcePayload);
  }
}

export class ResumeSourceStrategy extends TypedSourceStrategy {
  protected readonly sourceType = 'RESUME' as const;

  async buildContext(input: BuildRecommendationContextInput): Promise<RecommendationContext> {
    if (input.sourceType !== this.sourceType) return this.rejectWrongSource();
    return profileContext(
      input.userId,
      this.sourceType,
      input.authorizedSourcePayload,
      input.sourceId,
    );
  }
}

export class JobSourceStrategy extends TypedSourceStrategy {
  protected readonly sourceType = 'JOB' as const;

  async buildContext(input: BuildRecommendationContextInput): Promise<RecommendationContext> {
    if (input.sourceType !== this.sourceType) return this.rejectWrongSource();
    const job = input.authorizedSourcePayload;
    return {
      userId: input.userId,
      sourceType: this.sourceType,
      sourceId: input.sourceId,
      ...normalizeExtractedRecommendationContext({
        targetTitles: [job.title],
        requiredSkills: job.skills,
        industries: job.companyIndustry ? [job.companyIndustry] : [],
        locations: [job.location.formatted],
        remotePreference: job.location.remoteType ?? undefined,
        employmentTypes: job.employmentType ? [job.employmentType] : [],
        salaryExpectation: {
          minimum: job.salary.minimum ?? undefined,
          maximum: job.salary.maximum ?? undefined,
          currency: job.salary.currency ?? undefined,
        },
        sourceText: job.descriptionText,
      }),
    };
  }
}

export class TargetTextSourceStrategy extends TypedSourceStrategy {
  protected readonly sourceType = 'TARGET_TEXT' as const;
  private readonly fallbackProvider = new HeuristicTargetTextExtractionProvider();

  constructor(
    private readonly extractionProvider: RecommendationExtractionProvider = new HeuristicTargetTextExtractionProvider(),
  ) {
    super();
  }

  async buildContext(input: BuildRecommendationContextInput): Promise<RecommendationContext> {
    if (input.sourceType !== this.sourceType) return this.rejectWrongSource();
    const sourceText = input.authorizedSourcePayload.trim();
    let extracted;
    try {
      extracted = await this.extractionProvider.extractContextFromText(sourceText);
    } catch (error) {
      sourceLogger.warn(
        { err: error, event: 'recommendation.extraction_fallback' },
        'Primary extraction failed; using heuristic fallback',
      );
      extracted = await this.fallbackProvider.extractContextFromText(sourceText);
    }
    return {
      userId: input.userId,
      sourceType: this.sourceType,
      sourceId: input.sourceId,
      ...normalizeExtractedRecommendationContext({
        ...extracted,
        sourceText: extracted.sourceText?.trim() || sourceText,
      }),
    };
  }
}

export class CareerGoalSourceStrategy extends TypedSourceStrategy {
  protected readonly sourceType = 'CAREER_GOAL' as const;

  async buildContext(input: BuildRecommendationContextInput): Promise<RecommendationContext> {
    if (input.sourceType !== this.sourceType) return this.rejectWrongSource();
    return profileContext(
      input.userId,
      this.sourceType,
      input.authorizedSourcePayload,
      input.sourceId,
    );
  }
}

export class SavedSearchSourceStrategy extends TypedSourceStrategy {
  protected readonly sourceType = 'SAVED_SEARCH' as const;

  async buildContext(input: BuildRecommendationContextInput): Promise<RecommendationContext> {
    if (input.sourceType !== this.sourceType) return this.rejectWrongSource();
    return profileContext(
      input.userId,
      this.sourceType,
      input.authorizedSourcePayload,
      input.sourceId,
    );
  }
}
