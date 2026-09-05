import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * AJA-QA-001 gap fill: every other auto-apply test exercises duplicate
 * prevention and worker idempotency through the service layer against a
 * mocked repository *interface* - which proves the service calls the
 * repository correctly, but never exercises the actual Prisma-level
 * mechanisms that make those guarantees hold under a real race:
 *   - `create()`'s P2002 catch-and-remap (the DB-level backstop behind the
 *     app-level duplicate check, per AJA-PROD-007)
 *   - `claimForSubmission()`'s conditional `updateMany` (the atomic
 *     compare-and-swap that makes two workers racing on the same message
 *     safe, per AJA-PROD-008 / the queue idempotency requirement)
 * This file drives the real `PrismaJobApplicationRepository` against a
 * hand-stubbed `prisma.jobApplication` client so those two code paths are
 * actually verified rather than just trusted by inspection.
 */
const jobApplicationMock = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
};

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: { jobApplication: jobApplicationMock },
}));

const { PrismaJobApplicationRepository } =
  await import('@/modules/auto-apply/repositories/prisma-job-application.repository.js');

const baseRecord = {
  id: 'app-1',
  userId: 'user-1',
  jobId: 'job-1',
  normalisedJobUrl: null,
  canonicalJobId: null,
  companySlug: 'acme',
  jobTitle: 'Engineer',
  channel: 'EXTERNAL_MANUAL',
  status: 'DISCOVERED',
  approvalMode: 'MANUAL_APPROVAL',
  matchScore: null,
  eligibilityResult: null,
  resumeVersionId: null,
  coverLetterContent: null,
  consentId: null,
  approvedAt: null,
  queuedAt: null,
  submittedAt: null,
  externalApplicationId: null,
  externalConfirmationUrl: null,
  failureCode: null,
  failureMessage: null,
  planInputsHash: null,
  planVersion: 1,
  progressStep: null,
  reopenedAt: null,
  handoffOpenedAt: null,
  appliedNotes: null,
  abandonReason: null,
  abandonNote: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('PrismaJobApplicationRepository', () => {
  let repository: InstanceType<typeof PrismaJobApplicationRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaJobApplicationRepository();
  });

  describe('create — DB-level duplicate backstop (AJA-PROD-007)', () => {
    it('maps a P2002 unique-constraint violation to a 409 APPLICATION_EXISTS AppError', async () => {
      jobApplicationMock.create.mockRejectedValueOnce({ code: 'P2002' });
      jobApplicationMock.findUnique.mockResolvedValueOnce(baseRecord);

      await expect(
        repository.create({
          userId: 'user-1',
          jobId: 'job-1',
          canonicalJobId: null,
          companySlug: 'acme',
          jobTitle: 'Engineer',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'APPLICATION_EXISTS',
        data: { existingApplicationId: 'app-1' },
      });
    });

    it('still throws APPLICATION_EXISTS even if the concurrent-winner lookup itself races and finds nothing', async () => {
      jobApplicationMock.create.mockRejectedValueOnce({ code: 'P2002' });
      jobApplicationMock.findUnique.mockResolvedValueOnce(null);

      await expect(
        repository.create({
          userId: 'user-1',
          jobId: 'job-1',
          canonicalJobId: null,
          companySlug: 'acme',
          jobTitle: 'Engineer',
        }),
      ).rejects.toMatchObject({ statusCode: 409, code: 'APPLICATION_EXISTS' });
    });

    it('propagates a non-duplicate database error unchanged, never mislabels it as APPLICATION_EXISTS', async () => {
      const dbError = new Error('connection reset');
      jobApplicationMock.create.mockRejectedValueOnce(dbError);

      await expect(
        repository.create({
          userId: 'user-1',
          jobId: 'job-1',
          canonicalJobId: null,
          companySlug: 'acme',
          jobTitle: 'Engineer',
        }),
      ).rejects.toBe(dbError);
      expect(jobApplicationMock.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('claimForSubmission — atomic worker idempotency (AJA-PROD-008)', () => {
    it('guards the claim to QUEUED rows only, so a non-queued submission is never claimed', async () => {
      jobApplicationMock.updateMany.mockResolvedValueOnce({ count: 1 });
      jobApplicationMock.findFirst.mockResolvedValueOnce({ ...baseRecord, status: 'SUBMITTING' });

      await repository.claimForSubmission('user-1', 'app-1');

      expect(jobApplicationMock.updateMany).toHaveBeenCalledWith({
        where: { id: 'app-1', userId: 'user-1', status: 'QUEUED' },
        data: { status: 'SUBMITTING' },
      });
    });

    it('returns null (safe no-op) when the conditional update matches zero rows — the loser of a race between two workers', async () => {
      jobApplicationMock.updateMany.mockResolvedValueOnce({ count: 0 });

      const result = await repository.claimForSubmission('user-1', 'app-1');

      expect(result).toBeNull();
      expect(jobApplicationMock.findFirst).not.toHaveBeenCalled();
    });

    it('returns the claimed record when the conditional update wins the race', async () => {
      jobApplicationMock.updateMany.mockResolvedValueOnce({ count: 1 });
      jobApplicationMock.findFirst.mockResolvedValueOnce({ ...baseRecord, status: 'SUBMITTING' });

      const result = await repository.claimForSubmission('user-1', 'app-1');

      expect(result?.status).toBe('SUBMITTING');
    });
  });

  describe('updateStatus — optimistic lock (AA-010)', () => {
    it('guards the update with expectedStatus via updateMany', async () => {
      jobApplicationMock.updateMany.mockResolvedValueOnce({ count: 1 });
      jobApplicationMock.findFirst.mockResolvedValueOnce({ ...baseRecord, status: 'MATCHED' });

      await repository.updateStatus('user-1', 'app-1', { status: 'MATCHED' }, 'DISCOVERED');

      expect(jobApplicationMock.updateMany).toHaveBeenCalledWith({
        where: { id: 'app-1', userId: 'user-1', status: 'DISCOVERED' },
        data: { status: 'MATCHED' },
      });
      expect(jobApplicationMock.update).not.toHaveBeenCalled();
    });

    it('throws 409 INVALID_STATUS_TRANSITION when the expected status no longer matches', async () => {
      jobApplicationMock.updateMany.mockResolvedValueOnce({ count: 0 });
      jobApplicationMock.findFirst.mockResolvedValueOnce({ ...baseRecord, status: 'MATCHED' });

      await expect(
        repository.updateStatus('user-1', 'app-1', { status: 'MATCHED' }, 'DISCOVERED'),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'INVALID_STATUS_TRANSITION',
        message: 'This application was already updated. Refresh to see its current state.',
      });
    });

    it('throws 404 when the application is missing on a failed guard', async () => {
      jobApplicationMock.updateMany.mockResolvedValueOnce({ count: 0 });
      jobApplicationMock.findFirst.mockResolvedValueOnce(null);

      await expect(
        repository.updateStatus('user-1', 'missing', { status: 'MATCHED' }, 'DISCOVERED'),
      ).rejects.toMatchObject({ statusCode: 404, code: 'APPLICATION_NOT_FOUND' });
    });
  });

  describe('finalizeSubmission — optimistic lock (AA-010)', () => {
    it('guards finalize on expectedStatus SUBMITTING', async () => {
      jobApplicationMock.updateMany.mockResolvedValueOnce({ count: 1 });
      jobApplicationMock.findFirst.mockResolvedValueOnce({
        ...baseRecord,
        status: 'ACTION_REQUIRED',
      });

      await repository.finalizeSubmission(
        'user-1',
        'app-1',
        { status: 'ACTION_REQUIRED' },
        'SUBMITTING',
      );

      expect(jobApplicationMock.updateMany).toHaveBeenCalledWith({
        where: { id: 'app-1', userId: 'user-1', status: 'SUBMITTING' },
        data: expect.objectContaining({ status: 'ACTION_REQUIRED' }),
      });
    });

    it('throws 409 when finalize loses a race (e.g. reclaim already moved the row)', async () => {
      jobApplicationMock.updateMany.mockResolvedValueOnce({ count: 0 });
      jobApplicationMock.findFirst.mockResolvedValueOnce({
        ...baseRecord,
        status: 'SUBMISSION_FAILED',
      });

      await expect(
        repository.finalizeSubmission(
          'user-1',
          'app-1',
          { status: 'ACTION_REQUIRED' },
          'SUBMITTING',
        ),
      ).rejects.toMatchObject({ statusCode: 409, code: 'INVALID_STATUS_TRANSITION' });
    });
  });
});
