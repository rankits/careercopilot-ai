import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: {
    approvedResumeVersion: { findFirst: vi.fn() },
    resume: { findFirst: vi.fn() },
    resumeVersion: { findFirst: vi.fn() },
    resumeExtraction: { findFirst: vi.fn() },
    resumeAnalysis: { findFirst: vi.fn() },
  },
}));

import { prisma } from '@/shared/config/db.conf.js';
import { ResumeContentResolver } from '@/modules/auto-apply/services/resume-content-resolver.service.js';

describe('ResumeContentResolver', () => {
  const resolver = new ResumeContentResolver();
  const userId = 'user-1';
  const approvedId = 'approved-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves uploaded extraction text', async () => {
    vi.mocked(prisma.approvedResumeVersion.findFirst).mockResolvedValue({
      id: approvedId,
      resumeId: 'resume-1',
      builderResumeVersionId: null,
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    } as never);
    vi.mocked(prisma.resume.findFirst).mockResolvedValue({ id: 'resume-1' } as never);
    vi.mocked(prisma.resumeExtraction.findFirst).mockResolvedValue({
      extractedText: 'Uploaded resume body with Kubernetes experience.',
      createdAt: new Date('2026-08-01T00:00:00Z'),
    } as never);

    const result = await resolver.resolve({ userId, approvedResumeVersionId: approvedId });
    expect(result.source).toBe('UPLOADED_EXTRACTION');
    expect(result.text).toContain('Kubernetes');
    expect(result.contentHash).toHaveLength(64);
    expect(result.text).not.toMatch(/label|category/);
  });

  it('prefers pinned builder version content', async () => {
    vi.mocked(prisma.approvedResumeVersion.findFirst).mockResolvedValue({
      id: approvedId,
      resumeId: 'resume-1',
      builderResumeVersionId: 42,
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    } as never);
    vi.mocked(prisma.resume.findFirst).mockResolvedValue({ id: 'resume-1' } as never);
    vi.mocked(prisma.resumeVersion.findFirst).mockResolvedValue({
      id: 42,
      content: 'Builder version body mentioning Go and distributed systems.',
      createdAt: new Date('2026-08-02T00:00:00Z'),
    } as never);

    const result = await resolver.resolve({ userId, approvedResumeVersionId: approvedId });
    expect(result.source).toBe('BUILDER_VERSION');
    expect(result.builderVersionId).toBe(42);
    expect(result.text).toContain('distributed systems');
    expect(prisma.resumeExtraction.findFirst).not.toHaveBeenCalled();
  });

  it('rejects missing extracted text when no builder content exists', async () => {
    vi.mocked(prisma.approvedResumeVersion.findFirst).mockResolvedValue({
      id: approvedId,
      resumeId: 'resume-1',
      builderResumeVersionId: null,
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.resume.findFirst).mockResolvedValue({ id: 'resume-1' } as never);
    vi.mocked(prisma.resumeExtraction.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.resumeAnalysis.findFirst).mockResolvedValue(null as never);

    await expect(
      resolver.resolve({ userId, approvedResumeVersionId: approvedId }),
    ).rejects.toMatchObject({ code: 'RESUME_CONTENT_UNAVAILABLE', statusCode: 422 });
  });

  it('rejects cross-user approved resume lookup', async () => {
    vi.mocked(prisma.approvedResumeVersion.findFirst).mockResolvedValue(null as never);
    await expect(
      resolver.resolve({ userId: 'other-user', approvedResumeVersionId: approvedId }),
    ).rejects.toMatchObject({ code: 'RESUME_VERSION_NOT_FOUND', statusCode: 404 });
  });
});
