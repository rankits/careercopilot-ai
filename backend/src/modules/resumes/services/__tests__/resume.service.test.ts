import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AppError } from '@/shared/utils/errors/AppError.js';

const {
  findResumeByIdMock,
  findLatestExtractionMock,
  findCandidateProfileByUserIdMock,
  updateCandidateProfileMock,
  upsertCandidateProfileMock,
  listResumesMock,
} = vi.hoisted(() => ({
  findResumeByIdMock: vi.fn(),
  findLatestExtractionMock: vi.fn(),
  findCandidateProfileByUserIdMock: vi.fn(),
  updateCandidateProfileMock: vi.fn(),
  upsertCandidateProfileMock: vi.fn(),
  listResumesMock: vi.fn(),
}));

vi.mock('@/modules/resumes/repositories/resume.repository.js', () => ({
  resumeRepository: {
    createResume: vi.fn(),
    findResumeById: findResumeByIdMock,
    findLatestExtraction: findLatestExtractionMock,
    findLatestParseRun: vi.fn(),
    findCandidateProfileByUserId: findCandidateProfileByUserIdMock,
    updateCandidateProfile: updateCandidateProfileMock,
    upsertCandidateProfile: upsertCandidateProfileMock,
    listResumes: listResumesMock,
  },
}));

const { markProfileCreatedMock } = vi.hoisted(() => ({
  markProfileCreatedMock: vi.fn(),
}));

vi.mock('@/modules/auth/repositories/auth.repository.js', () => ({
  authRepository: { markProfileCreated: markProfileCreatedMock },
}));

const { parseExistingResumeMock } = vi.hoisted(() => ({
  parseExistingResumeMock: vi.fn(),
}));

vi.mock('@/modules/resumes/services/resume-parsing.orchestrator.js', () => ({
  resumeParsingOrchestrator: { parseExistingResume: parseExistingResumeMock },
}));

const { invalidateUserRecommendationStateMock } = vi.hoisted(() => ({
  invalidateUserRecommendationStateMock: vi.fn(),
}));

vi.mock('@/modules/recommendations/services/recommendation-lifecycle.service.js', () => ({
  invalidateUserRecommendationState: invalidateUserRecommendationStateMock,
}));

vi.mock('@/modules/resumes/services/resume-processing.service.js', () => ({
  resumeProcessingService: { processUploadedResume: vi.fn() },
}));

vi.mock('@/modules/resumes/storage/resume-storage.factory.js', () => ({
  createResumeStorage: vi.fn(() => ({
    store: vi
      .fn()
      .mockResolvedValue({ url: 'https://example.com/r.pdf', key: 'k', driver: 'LOCAL' }),
  })),
}));

const { resumeService } = await import('@/modules/resumes/services/resume.service.js');

const ownerId = 'owner-1';
const otherId = 'other-2';

const baseResume = {
  id: 'resume-1',
  userId: ownerId,
  fileName: 'resume.pdf',
  originalName: 'resume.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 100,
  fileUrl: 'https://example.com/resume.pdf',
  storageKey: 'k',
  storageDriver: 'LOCAL',
  status: 'PROCESSED',
  failureReason: null,
  uploadedAt: new Date(),
  processedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resumeService ownership guards (AUTH-BE-003)', () => {
  describe.each([
    ['getResumeStatus', () => resumeService.getResumeStatus('resume-1', otherId)],
    ['getParsedData', () => resumeService.getParsedData('resume-1', otherId)],
    ['getParseStatus', () => resumeService.getParseStatus('resume-1', otherId)],
    ['startParse', () => resumeService.startParse('resume-1', otherId)],
    ['reparseResume', () => resumeService.reparseResume('resume-1', otherId)],
  ])('Given a resume owned by a different principal', (name, invoke) => {
    describe(`When ${name} is called by a non-owner`, () => {
      it('Then it rejects with a 404 RESUME_NOT_FOUND AppError', async () => {
        findResumeByIdMock.mockResolvedValue(baseResume);

        await expect(invoke()).rejects.toMatchObject({
          statusCode: 404,
          code: 'RESUME_NOT_FOUND',
        });
      });
    });
  });

  describe.each([
    ['getResumeStatus', () => resumeService.getResumeStatus('missing', ownerId)],
    ['reparseResume', () => resumeService.reparseResume('missing', ownerId)],
  ])('Given a resumeId that does not exist', (name, invoke) => {
    describe(`When ${name} is called`, () => {
      it('Then it rejects with the same 404 shape as the ownership-mismatch case', async () => {
        findResumeByIdMock.mockResolvedValue(null);

        await expect(invoke()).rejects.toBeInstanceOf(AppError);
        await expect(invoke()).rejects.toMatchObject({ statusCode: 404, code: 'RESUME_NOT_FOUND' });
      });
    });
  });

  describe('Given the caller owns the resume', () => {
    describe('When reparseResume is called', () => {
      it('Then the orchestrator is invoked with the caller principal as userId, not resume.userId', async () => {
        findResumeByIdMock.mockResolvedValue(baseResume);
        findLatestExtractionMock.mockResolvedValue({ extractedText: 'some text' });

        const result = await resumeService.reparseResume('resume-1', ownerId, 'bad parse');

        expect(result).toEqual({ resumeId: 'resume-1', status: 'QUEUED', reason: 'bad parse' });
        await vi.waitFor(() => expect(parseExistingResumeMock).toHaveBeenCalledTimes(1));
        expect(parseExistingResumeMock).toHaveBeenCalledWith(
          expect.objectContaining({ resumeId: 'resume-1', userId: ownerId, reason: 'bad parse' }),
        );
        expect(invalidateUserRecommendationStateMock).toHaveBeenCalledWith({
          userId: ownerId,
          sourceType: 'RESUME',
          sourceId: 'resume-1',
        });
      });
    });
  });
});

describe('resumeService.uploadResume identity (AUTH-BE-002)', () => {
  describe('Given a caller-supplied userId', () => {
    describe('When a resume is uploaded', () => {
      it('Then the resume is stored under exactly that userId (no anonymous fallback)', async () => {
        const { resumeRepository } =
          await import('@/modules/resumes/repositories/resume.repository.js');
        const createResumeMock = resumeRepository.createResume as ReturnType<typeof vi.fn>;
        createResumeMock.mockResolvedValue({ id: 'new-resume', status: 'UPLOADED' });

        await resumeService.uploadResume({
          file: {
            originalname: 'resume.pdf',
            mimetype: 'application/pdf',
            buffer: Buffer.from('x'),
            size: 1,
          } as Express.Multer.File,
          userId: ownerId,
        });

        expect(createResumeMock).toHaveBeenCalledWith(expect.objectContaining({ userId: ownerId }));
      });
    });
  });
});

describe('resumeService.confirmProfile ownership (AUTH-BE-002 / AUTH-BE-003)', () => {
  describe('Given the resumeId belongs to a different principal than userId', () => {
    describe('When confirmProfile is called', () => {
      it('Then it rejects with 404 and never touches the profile or auth repositories', async () => {
        findResumeByIdMock.mockResolvedValue({ ...baseResume, userId: otherId });

        await expect(
          resumeService.confirmProfile({ userId: ownerId, resumeId: 'resume-1' }),
        ).rejects.toMatchObject({ statusCode: 404, code: 'RESUME_NOT_FOUND' });

        expect(upsertCandidateProfileMock).not.toHaveBeenCalled();
        expect(markProfileCreatedMock).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the resumeId belongs to the confirming principal', () => {
    describe('When confirmProfile is called', () => {
      it('Then the profile is upserted and markProfileCreated is called with the numeric principal id', async () => {
        findResumeByIdMock.mockResolvedValue({ ...baseResume, userId: '42' });
        findLatestExtractionMock.mockResolvedValue({ extractedData: { skills: ['Go'] } });
        upsertCandidateProfileMock.mockResolvedValue({ userId: '42' });

        await resumeService.confirmProfile({ userId: '42', resumeId: 'resume-1' });

        expect(upsertCandidateProfileMock).toHaveBeenCalledWith(
          expect.objectContaining({ userId: '42', sourceResumeId: 'resume-1' }),
        );
        expect(markProfileCreatedMock).toHaveBeenCalledWith(42);
        expect(invalidateUserRecommendationStateMock).toHaveBeenCalledWith('42');
      });
    });
  });
});

describe('resumeService recommendation invalidation hooks (JRE-LIFE-001)', () => {
  it('invalidates recommendation state after a material candidate profile update', async () => {
    const existing = {
      userId: ownerId,
      personalDetails: {},
      experience: [],
      education: [],
      skills: ['Node.js'],
      certifications: [],
      sourceResumeId: 'resume-1',
      confirmedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    findCandidateProfileByUserIdMock.mockResolvedValue(existing);
    updateCandidateProfileMock.mockResolvedValue({ ...existing, skills: ['Node.js', 'AWS'] });

    await resumeService.updateCandidateProfile(ownerId, { skills: ['Node.js', 'AWS'] });

    expect(updateCandidateProfileMock).toHaveBeenCalledWith(ownerId, {
      skills: ['Node.js', 'AWS'],
    });
    expect(invalidateUserRecommendationStateMock).toHaveBeenCalledWith(ownerId);
  });
});

describe('resumeService.listResumes', () => {
  it('delegates to resumeRepository.listResumes with the provided userId', async () => {
    const mockResumes = [{ id: 'res-1', userId: ownerId }];
    listResumesMock.mockResolvedValue(mockResumes);

    const result = await resumeService.listResumes({ userId: ownerId });

    expect(listResumesMock).toHaveBeenCalledWith(ownerId);
    expect(result).toBe(mockResumes);
  });
});
