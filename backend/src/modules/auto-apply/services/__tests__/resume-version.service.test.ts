import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApprovedResumeVersionService } from '@/modules/auto-apply/services/resume-version.service.js';
import {
  IApprovedResumeVersionRepository,
  IResumeOwnershipLookup,
} from '@/modules/auto-apply/contracts/resume-version.contract.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { ApprovedResumeVersionDto } from '@/modules/auto-apply/types/resume-version.types.js';

describe('ApprovedResumeVersionService', () => {
  let mockRepo: IApprovedResumeVersionRepository;
  let mockOwnership: IResumeOwnershipLookup;
  let service: ApprovedResumeVersionService;

  const mockVersion: ApprovedResumeVersionDto = {
    id: 'version-1',
    userId: 'user-1',
    resumeId: 'resume-1',
    label: 'Backend Resume',
    category: 'Backend',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    mockRepo = {
      findManyByUserId: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(mockVersion),
      create: vi.fn().mockResolvedValue(mockVersion),
      update: vi.fn().mockResolvedValue(mockVersion),
      delete: vi.fn().mockResolvedValue(true),
    };
    mockOwnership = { belongsToUser: vi.fn().mockResolvedValue(true) };
    service = new ApprovedResumeVersionService(mockRepo, mockOwnership);
  });

  it('creates a version once resume ownership is confirmed', async () => {
    await service.createVersion('user-1', {
      resumeId: 'resume-1',
      label: 'Backend Resume',
      category: 'Backend',
      isActive: true,
    });

    expect(mockOwnership.belongsToUser).toHaveBeenCalledWith('resume-1', 'user-1');
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', resumeId: 'resume-1' }),
    );
  });

  it('rejects creating a version for a resume the caller does not own', async () => {
    vi.mocked(mockOwnership.belongsToUser).mockResolvedValue(false);

    await expect(
      service.createVersion('user-1', {
        resumeId: 'someone-elses-resume',
        label: 'Backend Resume',
        category: 'Backend',
        isActive: true,
      }),
    ).rejects.toThrow(new AppError('Resume not found', 404, 'RESUME_NOT_FOUND'));

    expect(mockRepo.create).not.toHaveBeenCalled();
  });
});
