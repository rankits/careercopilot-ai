import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import {
  DEFAULT_RECOMMENDATION_WEIGHTS,
  assignRecommendationCategory,
  assertValidRecommendationWeights,
} from '@/modules/recommendations/constants/recommendation.constants.js';
import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import type {
  RecommendationContext,
  RecommendationMatchType,
  RecommendationScoreComponentName,
  RecommendationReason,
  RecommendationScoreResult,
  ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';

export interface RecommendationScoreCalculator {
  readonly component: RecommendationScoreComponentName;
  calculate(
    context: RecommendationContext,
    job: JobListDto,
  ): Promise<{
    score: number;
    reasons: RecommendationReason[];
    matchedSkills?: string[];
    aliasSkills?: string[];
    relatedSkills?: string[];
    transferableSkills?: string[];
    missingSkills?: string[];
  }>;
}

export interface MatchTypeClassifier {
  classify(
    context: RecommendationContext,
    job: JobListDto,
    scoreResult: RecommendationScoreResult,
  ): RecommendationMatchType;
}

export class RecommendationScoringEngine {
  /** Heuristic calculator `reasons` are the persisted explanation source of truth. */
  private readonly calculators: ReadonlyMap<
    RecommendationScoreComponentName,
    RecommendationScoreCalculator
  >;

  constructor(
    calculators: readonly RecommendationScoreCalculator[],
    private readonly matchTypeClassifier: MatchTypeClassifier,
    private readonly weights = DEFAULT_RECOMMENDATION_WEIGHTS,
  ) {
    assertValidRecommendationWeights(weights);
    this.calculators = new Map(calculators.map((calculator) => [calculator.component, calculator]));
  }

  async score(context: RecommendationContext, job: JobListDto): Promise<ScoredJobRecommendation> {
    const missing = Object.keys(this.weights).filter(
      (component) => !this.calculators.has(component as RecommendationScoreComponentName),
    );
    if (missing.length > 0) {
      throw new RecommendationError(
        `Recommendation scoring calculators are not configured: ${missing.join(', ')}`,
        501,
        RECOMMENDATION_ERROR_CODES.SCORING_NOT_CONFIGURED,
      );
    }

    const calculated = await Promise.all(
      [...this.calculators.values()].map(async (calculator) => ({
        componentName: calculator.component,
        result: await calculator.calculate(context, job),
      })),
    );
    for (const { componentName, result } of calculated) {
      if (!Number.isFinite(result.score) || result.score < 0 || result.score > 1) {
        throw new RangeError(`${componentName} calculator returned an invalid score`);
      }
    }

    const componentScores: Partial<Record<RecommendationScoreComponentName, number>> = {};
    for (const { componentName, result } of calculated) {
      componentScores[componentName] = result.score;
    }
    const components = {
      requiredSkills: componentScores.requiredSkills!,
      title: componentScores.title!,
      experience: componentScores.experience!,
      responsibilities: componentScores.responsibilities!,
      preferredSkills: componentScores.preferredSkills!,
      location: componentScores.location!,
      industry: componentScores.industry!,
      salary: componentScores.salary!,
      qualifications: componentScores.qualifications!,
    };
    const overallScore = calculated.reduce(
      (total, component) => total + component.result.score * this.weights[component.componentName],
      0,
    );
    const scoreResult: RecommendationScoreResult = {
      overallScore,
      components,
      matchedSkills: calculated.flatMap(({ result }) => result.matchedSkills ?? []),
      aliasSkills: calculated.flatMap(({ result }) => result.aliasSkills ?? []),
      relatedSkills: calculated.flatMap(({ result }) => result.relatedSkills ?? []),
      transferableSkills: calculated.flatMap(({ result }) => result.transferableSkills ?? []),
      missingSkills: calculated.flatMap(({ result }) => result.missingSkills ?? []),
      reasons: calculated.flatMap(({ result }) => result.reasons),
    };
    return {
      job,
      scoreResult,
      category: assignRecommendationCategory(overallScore),
      matchType: this.matchTypeClassifier.classify(context, job, scoreResult),
    };
  }
}
