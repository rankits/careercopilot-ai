import { IApplicationAnswerRepository } from '@/modules/auto-apply/contracts/application-answer.contract.js';
import { PreparedScreeningAnswer } from '@/modules/auto-apply/types/application-content.types.js';
import {
  isProhibitedQuestionKey,
  VAULT_SCREENING_KEYS,
} from '@/modules/auto-apply/services/content-safety.util.js';

/**
 * Vault-first screening answer preparation (AJA-AI-001 / AJA-AI-002).
 * Never invents answers; never fills prohibited demographic keys.
 */
export class ScreeningAnswerPreparationService {
  constructor(private readonly answerRepository: IApplicationAnswerRepository) {}

  async prepareFromVault(userId: string): Promise<PreparedScreeningAnswer[]> {
    const answers = await this.answerRepository.findManyByUserId(userId);
    const byKey = new Map(
      answers
        .filter((a) => a.source === 'USER_VERIFIED' && a.answer.trim())
        .map((a) => [a.questionKey, a]),
    );

    const prepared: PreparedScreeningAnswer[] = [];

    for (const { key, label } of VAULT_SCREENING_KEYS) {
      if (isProhibitedQuestionKey(key)) {
        prepared.push({
          questionKey: key,
          questionLabel: label,
          answer: null,
          status: 'REQUIRES_USER_ACTION',
          source: null,
          confidence: 0,
          evidence: [],
          requiresUserReview: true,
        });
        continue;
      }

      const vault = byKey.get(key);
      if (vault) {
        prepared.push({
          questionKey: key,
          questionLabel: label,
          answer: vault.answer,
          status: 'READY',
          source: 'USER_VERIFIED',
          confidence: 1,
          evidence: [`Verified answer vault (${key})`],
          requiresUserReview: vault.sensitive || !vault.autoSubmitAllowed,
        });
      } else {
        prepared.push({
          questionKey: key,
          questionLabel: label,
          answer: null,
          status: 'REQUIRES_USER_ACTION',
          source: null,
          confidence: 0,
          evidence: [],
          requiresUserReview: true,
        });
      }
    }

    // Include any additional non-prohibited USER_VERIFIED answers not in the baseline list.
    for (const answer of answers) {
      if (isProhibitedQuestionKey(answer.questionKey)) continue;
      if (VAULT_SCREENING_KEYS.some((item) => item.key === answer.questionKey)) continue;
      if (answer.source !== 'USER_VERIFIED' || !answer.answer.trim()) continue;

      prepared.push({
        questionKey: answer.questionKey,
        questionLabel: answer.questionKey.replace(/_/g, ' '),
        answer: answer.answer,
        status: 'READY',
        source: 'USER_VERIFIED',
        confidence: 1,
        evidence: [`Verified answer vault (${answer.questionKey})`],
        requiresUserReview: answer.sensitive || !answer.autoSubmitAllowed,
      });
    }

    return prepared;
  }
}
