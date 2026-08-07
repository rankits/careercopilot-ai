import {
  ICandidateApplicationProfileRepository,
  ICandidateApplicationProfileService,
} from '@/modules/auto-apply/contracts/candidate-profile.contract.js';
import { CandidateApplicationProfileDto } from '@/modules/auto-apply/types/candidate-profile.types.js';
import { UpsertCandidateApplicationProfileInput } from '@/modules/auto-apply/validations/candidate-profile.validation.js';

export class CandidateApplicationProfileService implements ICandidateApplicationProfileService {
  constructor(private readonly repository: ICandidateApplicationProfileRepository) {}

  async getProfile(userId: string): Promise<CandidateApplicationProfileDto | null> {
    return this.repository.findByUserId(userId);
  }

  async upsertProfile(
    userId: string,
    input: UpsertCandidateApplicationProfileInput,
  ): Promise<CandidateApplicationProfileDto> {
    return this.repository.upsert(userId, input);
  }
}
