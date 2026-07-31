import type { RecommendationContext } from '@/modules/recommendations/types/recommendations.types.js';
import type { RecommendationFiltersDto } from '@/modules/recommendations/validations/recommendation.schema.js';

/** Merges optional request filters onto a built recommendation context. */
export const applyRecommendationFilters = (
  context: RecommendationContext,
  filters?: RecommendationFiltersDto,
): RecommendationContext => {
  if (!filters) return context;
  return {
    ...context,
    locations: filters.locations ?? context.locations,
    remotePreference: filters.workModes?.[0] ?? context.remotePreference,
    employmentTypes: filters.employmentTypes ?? context.employmentTypes,
    industries: filters.industries ?? context.industries,
    seniority: filters.experienceLevels?.[0] ?? context.seniority,
    salaryExpectation: {
      ...context.salaryExpectation,
      minimum: filters.minimumSalary ?? context.salaryExpectation.minimum,
      maximum: filters.maximumSalary ?? context.salaryExpectation.maximum,
      currency: filters.currency ?? context.salaryExpectation.currency,
    },
  };
};
