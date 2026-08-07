import type {
  ResumeContextRepository,
  SafeResumeRecord,
} from '@/modules/ai-mail/contracts/resume-context.repository.js';
import { prisma } from '@/shared/config/db.conf.js';

const safeSelect = {
  id: true,
  fileName: true,
  originalName: true,
  status: true,
  uploadedAt: true,
  updatedAt: true,
  processedAt: true,
  parseRuns: {
    orderBy: [{ createdAt: 'desc' as const }, { id: 'asc' as const }],
    take: 1,
    select: {
      status: true,
      parsedData: true,
      extraction: { select: { extractedData: true } },
    },
  },
};

const mapRecord = (record: Awaited<ReturnType<typeof queryOne>>): SafeResumeRecord | null => {
  if (!record) return null;
  const latest = record.parseRuns[0];
  return {
    id: record.id,
    fileName: record.fileName,
    originalName: record.originalName,
    status: record.status,
    uploadedAt: record.uploadedAt,
    updatedAt: record.updatedAt,
    processedAt: record.processedAt,
    latestParse: latest
      ? {
          status: latest.status,
          parsedData: latest.parsedData,
          extractedData: latest.extraction?.extractedData,
        }
      : undefined,
  };
};

const queryOne = (resumeId: string, userId: string) =>
  prisma.resume.findFirst({ where: { id: resumeId, userId }, select: safeSelect });

export class PrismaResumeContextRepository implements ResumeContextRepository {
  async findForUser(resumeId: string, userId: string): Promise<SafeResumeRecord | null> {
    return mapRecord(await queryOne(resumeId, userId));
  }

  async listForUser(userId: string): Promise<SafeResumeRecord[]> {
    const records = await prisma.resume.findMany({
      where: { userId },
      orderBy: [{ uploadedAt: 'desc' }, { id: 'asc' }],
      select: safeSelect,
    });
    return records.map((record) => mapRecord(record)!);
  }

  async selectionHints(userId: string) {
    const [profile, approved] = await Promise.all([
      prisma.candidateProfile.findUnique({
        where: { userId },
        select: { sourceResumeId: true },
      }),
      prisma.approvedResumeVersion.findFirst({
        where: { userId, isActive: true },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        select: { resumeId: true },
      }),
    ]);
    return {
      sourceResumeId: profile?.sourceResumeId ?? undefined,
      activeApprovedResumeId: approved?.resumeId,
    };
  }
}

export const prismaResumeContextRepository = new PrismaResumeContextRepository();
