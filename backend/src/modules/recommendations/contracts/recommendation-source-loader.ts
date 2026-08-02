import type { CandidateProfileSourceInput } from '@/modules/recommendations/mappers/candidate-profile-source.mapper.js';
import type { CareerTargetSourceRecord } from '@/modules/recommendations/mappers/career-target-source.mapper.js';

export type ResumeProfileSourceLookup =
  | { status: 'FOUND'; payload: CandidateProfileSourceInput }
  | { status: 'NOT_FOUND' }
  | {
      status: 'INCOMPLETE';
      reason: 'PARSE_NOT_READY' | 'PARSE_DATA_MISSING';
    };

/**
 * Narrow loader for recommendation source authorization.
 * Implemented against the resumes repository without exporting its full surface.
 */
export interface RecommendationSourceLoader {
  findCandidateProfileByUserId(userId: string): Promise<CandidateProfileSourceInput | null>;
  lookupOwnedResumeProfileSource?(
    userId: string,
    resumeId: string,
  ): Promise<ResumeProfileSourceLookup>;
  findOwnedResumeProfileSource(
    userId: string,
    resumeId: string,
  ): Promise<CandidateProfileSourceInput | null>;
  findOwnedCareerTargetSource?(
    userId: string,
    careerTargetId: string,
  ): Promise<CareerTargetSourceRecord | null>;
}
