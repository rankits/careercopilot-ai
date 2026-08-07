import type { CandidateProfileSource } from '@/modules/ai-mail/application/candidate-profile-context.builder.js';

export interface CandidateProfileContextRepository {
  findForUser(userId: string): Promise<CandidateProfileSource | null>;
}
