import { prisma } from '@/shared/config/db.conf.js';
import {
  IMatchScoreLookup,
  ITrackerDuplicateLookup,
  IUserContactLookup,
  TrackerDuplicateSnapshot,
  UserContactSnapshot,
} from '@/modules/auto-apply/contracts/application-readiness.contract.js';

export class PrismaUserContactLookup implements IUserContactLookup {
  async findByUserId(userId: string): Promise<UserContactSnapshot | null> {
    const numericId = Number(userId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return null;
    }
    const user = await prisma.user.findUnique({
      where: { id: numericId },
      select: { firstName: true, lastName: true, email: true, phone: true },
    });
    if (!user) return null;
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    };
  }
}

export class PrismaMatchScoreLookup implements IMatchScoreLookup {
  async findOverallScore(userId: string, jobId: string): Promise<number | null> {
    const recommendation = await prisma.jobRecommendation.findFirst({
      where: { userId, jobId },
      orderBy: { createdAt: 'desc' },
      select: { overallScore: true },
    });
    return recommendation?.overallScore ?? null;
  }
}

export class PrismaTrackerDuplicateLookup implements ITrackerDuplicateLookup {
  async findActiveByUserAndJobId(
    userId: string,
    jobId: string,
  ): Promise<TrackerDuplicateSnapshot | null> {
    const record = await prisma.application.findFirst({
      where: {
        userId,
        jobId,
        archivedAt: null,
        currentStatus: { not: 'WITHDRAWN' },
      },
      select: {
        id: true,
        jobId: true,
        normalisedJobUrl: true,
        currentStatus: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    return record;
  }
}
