import { CandidateApplicationProfileDto } from '@/modules/auto-apply/types/candidate-profile.types.js';
import { UpsertCandidateApplicationProfileInput } from '@/modules/auto-apply/validations/candidate-profile.validation.js';

export interface ICandidateApplicationProfileRepository {
  findByUserId(userId: string): Promise<CandidateApplicationProfileDto | null>;
  upsert(
    userId: string,
    input: UpsertCandidateApplicationProfileInput,
  ): Promise<CandidateApplicationProfileDto>;
}

export interface ICandidateApplicationProfileService {
  getProfile(userId: string): Promise<CandidateApplicationProfileDto | null>;
  upsertProfile(
    userId: string,
    input: UpsertCandidateApplicationProfileInput,
  ): Promise<CandidateApplicationProfileDto>;
}
