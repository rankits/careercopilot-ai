import type { CandidateProfileSourceInput } from '@/modules/recommendations/mappers/candidate-profile-source.mapper.js';

/**
 * Narrow loader for recommendation source authorization.
 * Implemented against the resumes repository without exporting its full surface.
 */
export interface RecommendationSourceLoader {
  findCandidateProfileByUserId(userId: string): Promise<CandidateProfileSourceInput | null>;
  findOwnedResumeProfileSource(
    userId: string,
    resumeId: string,
  ): Promise<CandidateProfileSourceInput | null>;
}
