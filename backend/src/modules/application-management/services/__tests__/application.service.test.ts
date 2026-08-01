import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ApplicationStatus,
  ApplicationSourceType,
  ApplicationPriority,
  StatusChangedBy,
} from '@prisma/client';
import { ApplicationManagementService } from '@/modules/application-management/services/application.service.js';
import { IApplicationRepository } from '@/modules/application-management/contracts/application.repository.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import {
  ApplicationDto,
  ApplicationDetailDto,
} from '@/modules/application-management/types/application.types.js';

describe('ApplicationManagementService', () => {
  let mockRepo: IApplicationRepository;
  let service: ApplicationManagementService;

  const mockAppDto: ApplicationDto = {
    id: 'app-1',
    userId: 'user-1',
    jobId: null,
    companyId: null,
    jobTitle: 'Backend Engineer',
    companyName: 'Acme Corp',
    companyLogoUrl: null,
    originalJobUrl: 'https://acme.com/jobs/backend',
    location: null,
    remoteType: null,
    employmentType: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    currentStatus: ApplicationStatus.SAVED,
    primarySourceType: ApplicationSourceType.EXTERNAL_JOB_URL,
    priority: ApplicationPriority.MEDIUM,
    interestLevel: null,
    appliedAt: null,
    firstResponseAt: null,
    closedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
  };

  const mockAppDetailDto: ApplicationDetailDto = {
    ...mockAppDto,
    descriptionSnapshot: null,
    skillsSnapshot: [],
    statusHistory: [],
    notes: [],
    tasks: [],
  };

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockResolvedValue(mockAppDto),
      findById: vi.fn().mockResolvedValue(mockAppDetailDto),
      findByJobId: vi.fn().mockResolvedValue(null),
      findByNormalisedUrl: vi.fn().mockResolvedValue(null),
      list: vi.fn(),
      update: vi.fn().mockResolvedValue(mockAppDto),
      delete: vi.fn().mockResolvedValue(true),
      addStatusHistory: vi.fn(),
      addNote: vi.fn(),
      deleteNote: vi.fn(),
      addTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
    };

    service = new ApplicationManagementService(mockRepo);
  });

  it('throws 409 conflict when creating an EXTERNAL_JOB_URL application that already exists for user', async () => {
    vi.mocked(mockRepo.findByNormalisedUrl).mockResolvedValue(mockAppDto);

    await expect(
      service.createApplication('user-1', {
        sourceType: 'EXTERNAL_JOB_URL',
        originalJobUrl: 'https://acme.com/jobs/backend?utm_source=test',
        jobTitle: 'Backend Engineer',
        companyName: 'Acme Corp',
        currentStatus: ApplicationStatus.SAVED,
        priority: ApplicationPriority.MEDIUM,
      }),
    ).rejects.toThrowError(
      new AppError(
        'You are already tracking an application for this job URL.',
        409,
        'APPLICATION_EXISTS',
        {
          existingApplicationId: 'app-1',
        },
      ),
    );
  });

  it('creates MANUAL application and populates appliedAt when initial status is APPLIED', async () => {
    await service.createApplication('user-1', {
      sourceType: 'MANUAL',
      jobTitle: 'Frontend Engineer',
      companyName: 'Beta Inc',
      currentStatus: ApplicationStatus.APPLIED,
      priority: ApplicationPriority.HIGH,
    });

    expect(mockRepo.create).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(mockRepo.create).mock.calls[0][0];
    expect(callArgs.appliedAt).toBeInstanceOf(Date);
    expect(callArgs.currentStatus).toBe(ApplicationStatus.APPLIED);
  });

  it('creates MANUAL application with an explicit appliedAt date', async () => {
    await service.createApplication('user-1', {
      sourceType: 'MANUAL',
      jobTitle: 'Senior Full Stack Engineer',
      companyName: 'Acme Corp',
      appliedAt: '2025-05-08',
      currentStatus: ApplicationStatus.SAVED,
      priority: ApplicationPriority.MEDIUM,
    });

    const callArgs = vi.mocked(mockRepo.create).mock.calls[0][0];
    expect(callArgs.appliedAt?.toISOString()).toBe('2025-05-08T00:00:00.000Z');
    expect(callArgs.currentStatus).toBe(ApplicationStatus.SAVED);
  });

  it('updates appliedAt when patching an application', async () => {
    await service.updateApplication('user-1', 'app-1', {
      appliedAt: '2025-05-08',
    });

    expect(mockRepo.update).toHaveBeenCalledWith('user-1', 'app-1', {
      appliedAt: new Date('2025-05-08T00:00:00.000Z'),
    });
  });

  it('throws 404 AppError if application is not found during transitionStatus', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(
      service.transitionStatus('user-1', 'non-existent-id', {
        toStatus: ApplicationStatus.INTERVIEW,
      }),
    ).rejects.toThrowError(new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND'));
  });

  it('updates firstResponseAt automatically when reaching an interview stage', async () => {
    await service.transitionStatus('user-1', 'app-1', {
      toStatus: ApplicationStatus.INTERVIEW,
      note: 'First technical interview scheduled',
    });

    expect(mockRepo.addStatusHistory).toHaveBeenCalledWith('user-1', 'app-1', {
      fromStatus: ApplicationStatus.SAVED,
      toStatus: ApplicationStatus.INTERVIEW,
      changedBy: StatusChangedBy.USER,
      note: 'First technical interview scheduled',
    });

    const updateCall = vi.mocked(mockRepo.update).mock.calls[0][2];
    expect(updateCall.firstResponseAt).toBeInstanceOf(Date);
    expect(updateCall.appliedAt).toBeInstanceOf(Date); // Auto-sets appliedAt if it was null
  });

  it('updates closedAt automatically when reaching a terminal stage (e.g., HIRED or REJECTED)', async () => {
    await service.transitionStatus('user-1', 'app-1', {
      toStatus: ApplicationStatus.HIRED,
    });

    const updateCall = vi.mocked(mockRepo.update).mock.calls[0][2];
    expect(updateCall.closedAt).toBeInstanceOf(Date);
  });
});
