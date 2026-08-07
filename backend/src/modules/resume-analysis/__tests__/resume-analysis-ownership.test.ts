import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@/shared/utils/errors/AppError.js';

// assertOwnedResume / the version guards now scope their where clause to the caller
// (e.g. prisma.resume.findFirst({ where: { id, userId } })), so both "not yours" and
// "doesn't exist" resolve to null and surface the same 404. That is exactly what the
// OWASP A01 guard requires - tests must never let the mock distinguish the two.
const mockResumeFindFirst = vi.fn();
const mockResumeAnalysisFindFirst = vi.fn();
const mockResumeVersionFindFirst = vi.fn();
const mockResumeVersionFindMany = vi.fn();
const mockResumeVersionDelete = vi.fn();

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: {
    resume: { findFirst: (...args: unknown[]) => mockResumeFindFirst(...args) },
    resumeAnalysis: { findFirst: (...args: unknown[]) => mockResumeAnalysisFindFirst(...args) },
    resumeVersion: {
      findFirst: (...args: unknown[]) => mockResumeVersionFindFirst(...args),
      findMany: (...args: unknown[]) => mockResumeVersionFindMany(...args),
      delete: (...args: unknown[]) => mockResumeVersionDelete(...args),
    },
  },
}));

const { resumeAnalysisService } =
  await import('@/modules/resume-analysis/services/resume-analysis.service.js');

const OWNER_ID = 'user-owner';
const OTHER_ID = 'user-other';
const RESUME_ID = 'resume-1';

describe('resume-analysis ownership guards (OWASP A01 - IDOR)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assertOwnedResume (via getAnalysis)', () => {
    it('rejects a resume owned by a different user with a 404, never reaching resumeAnalysis', async () => {
      // The scoped where clause misses, so findFirst returns null for a foreign row too.
      mockResumeFindFirst.mockResolvedValue(null);

      await expect(resumeAnalysisService.getAnalysis(RESUME_ID, OWNER_ID)).rejects.toMatchObject({
        statusCode: 404,
        code: 'RESUME_NOT_FOUND',
      } satisfies Partial<AppError>);
      expect(mockResumeFindFirst).toHaveBeenCalledWith({
        where: { id: RESUME_ID, userId: OWNER_ID },
      });
      expect(mockResumeAnalysisFindFirst).not.toHaveBeenCalled();
    });

    it('rejects a resume that does not exist with the same 404 (no existence leak)', async () => {
      mockResumeFindFirst.mockResolvedValue(null);

      await expect(resumeAnalysisService.getAnalysis(RESUME_ID, OWNER_ID)).rejects.toMatchObject({
        statusCode: 404,
        code: 'RESUME_NOT_FOUND',
      });
      expect(mockResumeAnalysisFindFirst).not.toHaveBeenCalled();
    });

    it('proceeds past the guard for the owning user', async () => {
      mockResumeFindFirst.mockResolvedValue({ id: RESUME_ID, userId: OWNER_ID });
      mockResumeAnalysisFindFirst.mockResolvedValue(null);

      const result = await resumeAnalysisService.getAnalysis(RESUME_ID, OWNER_ID);

      expect(result).toBeNull();
      expect(mockResumeAnalysisFindFirst).toHaveBeenCalledWith({
        where: { resumeId: RESUME_ID, resume: { userId: OWNER_ID } },
        include: expect.anything(),
        orderBy: expect.anything(),
      });
    });
  });

  describe('ownership-scoped saved versions (via getSavedVersion / deleteSavedVersion)', () => {
    const versionForOwner = () => ({
      id: 7,
      analysis: { resume: { userId: OWNER_ID } },
    });

    it('rejects a saved version whose resume belongs to a different user', async () => {
      // Scoped where { id, analysis: { resume: { userId } } } misses for a foreign row.
      mockResumeVersionFindFirst.mockResolvedValue(null);

      await expect(resumeAnalysisService.getSavedVersion(7, OWNER_ID)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('rejects deleting a saved version that does not belong to the caller, without deleting it', async () => {
      mockResumeVersionFindFirst.mockResolvedValue(null);

      await expect(resumeAnalysisService.deleteSavedVersion(7, OWNER_ID)).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockResumeVersionDelete).not.toHaveBeenCalled();
    });

    it('allows deleting a saved version the caller owns', async () => {
      mockResumeVersionFindFirst.mockResolvedValue(versionForOwner());
      mockResumeVersionDelete.mockResolvedValue({ id: 7 });

      const result = await resumeAnalysisService.deleteSavedVersion(7, OWNER_ID);

      expect(result).toEqual({ id: 7 });
      expect(mockResumeVersionFindFirst).toHaveBeenCalledWith({
        where: { id: 7, analysis: { resume: { userId: OWNER_ID } } },
      });
      expect(mockResumeVersionDelete).toHaveBeenCalledWith({ where: { id: 7 } });
    });
  });

  describe('listSavedVersions', () => {
    it('scopes the query to the caller - never returns every user’s saved versions', async () => {
      mockResumeVersionFindMany.mockResolvedValue([]);

      await resumeAnalysisService.listSavedVersions(OWNER_ID);

      expect(mockResumeVersionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { analysis: { resume: { userId: OWNER_ID } } },
        }),
      );
    });
  });
});
