import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ScreeningAnswerPreparationService } from '@/modules/auto-apply/services/screening-answer-preparation.service.js';
import { IApplicationAnswerRepository } from '@/modules/auto-apply/contracts/application-answer.contract.js';
import { ApplicationAnswerDto } from '@/modules/auto-apply/types/application-answer.types.js';

describe('ScreeningAnswerPreparationService', () => {
  let answerRepo: IApplicationAnswerRepository;
  let service: ScreeningAnswerPreparationService;

  const vaultAnswer = (overrides: Partial<ApplicationAnswerDto>): ApplicationAnswerDto => ({
    id: 'a1',
    userId: 'user-1',
    questionKey: 'work_authorization',
    answer: 'Authorized to work in the US',
    source: 'USER_VERIFIED',
    sensitive: true,
    autoSubmitAllowed: false,
    lastVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    answerRepo = {
      findManyByUserId: vi.fn().mockResolvedValue([
        vaultAnswer({}),
        vaultAnswer({
          id: 'a2',
          questionKey: 'notice_period_days',
          answer: '30',
          sensitive: true,
        }),
        vaultAnswer({
          id: 'a3',
          questionKey: 'demographic_gender',
          answer: 'should-never-appear',
        }),
      ]),
      findByUserIdAndKey: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new ScreeningAnswerPreparationService(answerRepo);
  });

  it('fills vault-backed screening keys and never returns prohibited demographic answers', async () => {
    const prepared = await service.prepareFromVault('user-1');

    const workAuth = prepared.find((item) => item.questionKey === 'work_authorization');
    expect(workAuth).toMatchObject({
      status: 'READY',
      source: 'USER_VERIFIED',
      answer: 'Authorized to work in the US',
      requiresUserReview: true,
    });

    const notice = prepared.find((item) => item.questionKey === 'notice_period_days');
    expect(notice?.answer).toBe('30');

    expect(prepared.some((item) => item.questionKey === 'demographic_gender')).toBe(false);
    expect(prepared.some((item) => item.answer === 'should-never-appear')).toBe(false);
  });

  it('marks missing vault keys as REQUIRES_USER_ACTION', async () => {
    vi.mocked(answerRepo.findManyByUserId).mockResolvedValue([]);
    const prepared = await service.prepareFromVault('user-1');
    const experience = prepared.find((item) => item.questionKey === 'years_of_experience');
    expect(experience).toMatchObject({
      status: 'REQUIRES_USER_ACTION',
      answer: null,
    });
  });
});
