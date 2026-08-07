import { prisma } from '@/shared/config/db.conf.js';
import { IJobDescriptionLookup } from '@/modules/auto-apply/contracts/vacancy-email.contract.js';

export class PrismaJobDescriptionLookup implements IJobDescriptionLookup {
  async findDescriptionText(jobId: string): Promise<string | null> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { descriptionText: true },
    });
    return job?.descriptionText ?? null;
  }
}
