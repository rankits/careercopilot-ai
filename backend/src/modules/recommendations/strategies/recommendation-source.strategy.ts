import type {
  BuildRecommendationContextInput,
  CandidateProfileSourcePayload,
  RecommendationContext,
  RecommendationSourceType,
} from '@/modules/recommendations/types/recommendations.types.js';
import {
  RecommendationError,
  RECOMMENDATION_ERROR_CODES,
} from '@/modules/recommendations/errors/recommendation.error.js';

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
  targetTitles: payload.targetTitles ?? [],
  relatedTitles: payload.relatedTitles ?? [],
  requiredSkills: payload.requiredSkills ?? [],
  preferredSkills: payload.preferredSkills ?? [],
  yearsOfExperience: payload.yearsOfExperience,
  seniority: payload.seniority,
  industries: payload.industries ?? [],
  locations: payload.locations ?? [],
  remotePreference: payload.remotePreference,
  employmentTypes: payload.employmentTypes ?? [],
  salaryExpectation: payload.salaryExpectation ?? {},
  education: payload.education ?? [],
  certifications: payload.certifications ?? [],
  excludedCompanies: payload.excludedCompanies ?? [],
  excludedSkills: payload.excludedSkills ?? [],
  sourceText: payload.sourceText,
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
      targetTitles: [job.title],
      relatedTitles: [],
      requiredSkills: job.skills,
      preferredSkills: [],
      industries: job.companyIndustry ? [job.companyIndustry] : [],
      locations: [job.location.formatted],
      remotePreference: job.location.remoteType ?? undefined,
      employmentTypes: job.employmentType ? [job.employmentType] : [],
      salaryExpectation: {
        minimum: job.salary.minimum ?? undefined,
        maximum: job.salary.maximum ?? undefined,
        currency: job.salary.currency ?? undefined,
      },
      education: [],
      certifications: [],
      excludedCompanies: [],
      excludedSkills: [],
      sourceText: job.descriptionText,
    };
  }
}

export class TargetTextSourceStrategy extends TypedSourceStrategy {
  protected readonly sourceType = 'TARGET_TEXT' as const;

  async buildContext(input: BuildRecommendationContextInput): Promise<RecommendationContext> {
    if (input.sourceType !== this.sourceType) return this.rejectWrongSource();
    return {
      userId: input.userId,
      sourceType: this.sourceType,
      targetTitles: [],
      relatedTitles: [],
      requiredSkills: [],
      preferredSkills: [],
      industries: [],
      locations: [],
      employmentTypes: [],
      salaryExpectation: {},
      education: [],
      certifications: [],
      excludedCompanies: [],
      excludedSkills: [],
      sourceText: input.authorizedSourcePayload.trim(),
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
