import { AppError } from '@/shared/utils/errors/AppError.js';
import { IApplicationAnswerRepository } from '@/modules/auto-apply/contracts/application-answer.contract.js';
import { ApplicationAnswerDto } from '@/modules/auto-apply/types/application-answer.types.js';
import {
  CreateApplicationAnswerInput,
  UpdateApplicationAnswerInput,
} from '@/modules/auto-apply/validations/application-answer.validation.js';
import {
  PROHIBITED_QUESTION_KEYS,
  SENSITIVE_QUESTION_KEYS,
} from '@/modules/auto-apply/constants/sensitive-question-keys.js';

export class ApplicationAnswerService {
  constructor(private readonly repository: IApplicationAnswerRepository) {}

  async listAnswers(userId: string): Promise<ApplicationAnswerDto[]> {
    return this.repository.findManyByUserId(userId);
  }

  async createAnswer(
    userId: string,
    input: CreateApplicationAnswerInput,
  ): Promise<ApplicationAnswerDto> {
    if (PROHIBITED_QUESTION_KEYS.has(input.questionKey)) {
      throw new AppError(
        'Demographic, disability, and veteran-status answers are never stored, per platform policy.',
        403,
        'SENSITIVE_ANSWER_PROHIBITED',
      );
    }

    const sensitive = SENSITIVE_QUESTION_KEYS.has(input.questionKey);
    // Sensitive-but-storable keys always start non-auto-submittable — flipping
    // this to true is gated on a dedicated consent grant, wired in a later
    // wave once the planner/consent flows are connected end-to-end.
    const autoSubmitAllowed = sensitive ? false : input.autoSubmitAllowed;

    return this.repository.create({
      userId,
      questionKey: input.questionKey,
      answer: input.answer,
      sensitive,
      autoSubmitAllowed,
    });
  }

  async updateAnswer(
    userId: string,
    id: string,
    input: UpdateApplicationAnswerInput,
  ): Promise<ApplicationAnswerDto> {
    const existing = await this.repository.findById(userId, id);
    if (!existing) {
      throw new AppError('Verified answer not found', 404, 'ANSWER_NOT_FOUND');
    }

    const autoSubmitAllowed = existing.sensitive ? false : input.autoSubmitAllowed;

    return this.repository.update(userId, id, {
      answer: input.answer,
      autoSubmitAllowed,
    });
  }

  async deleteAnswer(userId: string, id: string): Promise<boolean> {
    return this.repository.delete(userId, id);
  }
}
