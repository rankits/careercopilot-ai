import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApplicationAnswerService } from '@/modules/auto-apply/services/application-answer.service.js';
import { IApplicationAnswerRepository } from '@/modules/auto-apply/contracts/application-answer.contract.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { ApplicationAnswerDto } from '@/modules/auto-apply/types/application-answer.types.js';

describe('ApplicationAnswerService', () => {
  let mockRepo: IApplicationAnswerRepository;
  let service: ApplicationAnswerService;

  const mockAnswer: ApplicationAnswerDto = {
    id: 'answer-1',
    userId: 'user-1',
    questionKey: 'notice_period_days',
    answer: '30',
    source: 'USER_VERIFIED',
    sensitive: true,
    autoSubmitAllowed: false,
    lastVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    mockRepo = {
      findManyByUserId: vi.fn().mockResolvedValue([]),
      findByUserIdAndKey: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(mockAnswer),
      create: vi.fn().mockResolvedValue(mockAnswer),
      update: vi.fn().mockResolvedValue(mockAnswer),
      delete: vi.fn().mockResolvedValue(true),
    };
    service = new ApplicationAnswerService(mockRepo);
  });

  it('rejects a prohibited demographic question key outright', async () => {
    await expect(
      service.createAnswer('user-1', {
        questionKey: 'disability_status',
        answer: 'Prefer not to say',
        autoSubmitAllowed: false,
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'SENSITIVE_ANSWER_PROHIBITED', statusCode: 403 }),
    );
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('forces autoSubmitAllowed=false for a sensitive-but-storable key even if the caller asks for true', async () => {
    await service.createAnswer('user-1', {
      questionKey: 'notice_period_days',
      answer: '30',
      autoSubmitAllowed: true,
    });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ sensitive: true, autoSubmitAllowed: false }),
    );
  });

  it('honors autoSubmitAllowed for a non-sensitive key', async () => {
    await service.createAnswer('user-1', {
      questionKey: 'years_experience_java',
      answer: '5',
      autoSubmitAllowed: true,
    });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ sensitive: false, autoSubmitAllowed: true }),
    );
  });

  it('never re-enables autoSubmitAllowed on update for an already-sensitive answer', async () => {
    await service.updateAnswer('user-1', 'answer-1', { autoSubmitAllowed: true });

    expect(mockRepo.update).toHaveBeenCalledWith(
      'user-1',
      'answer-1',
      expect.objectContaining({ autoSubmitAllowed: false }),
    );
  });

  it('throws 404 updating an answer that does not belong to the caller', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(
      service.updateAnswer('user-1', 'someone-elses-answer', { answer: 'X' }),
    ).rejects.toThrow(new AppError('Verified answer not found', 404, 'ANSWER_NOT_FOUND'));
  });
});
