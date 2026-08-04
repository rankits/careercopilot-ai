import { prisma } from '@/shared/config/db.conf.js';
import { pickPrimaryApplyUrl } from '@/modules/job-listing/utils/safe-apply-url.js';
import {
  IChannelDetectionJobLookup,
  JobChannelSnapshot,
} from '@/modules/auto-apply/contracts/channel-detection.contract.js';

export class PrismaChannelDetectionJobLookup implements IChannelDetectionJobLookup {
  async findJobChannelSnapshot(jobId: string): Promise<JobChannelSnapshot | null> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { sources: { orderBy: { priority: 'desc' } } },
    });
    if (!job) return null;

    return {
      id: job.id,
      status: job.status,
      applyUrl: pickPrimaryApplyUrl(job.sources),
    };
  }
}
