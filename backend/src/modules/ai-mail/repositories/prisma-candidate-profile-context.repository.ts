import type { CandidateProfileContextRepository } from '@/modules/ai-mail/contracts/candidate-profile-context.repository.js';
import { prisma } from '@/shared/config/db.conf.js';

export class PrismaCandidateProfileContextRepository implements CandidateProfileContextRepository {
  async findForUser(userId: string) {
    const [profile, overlay] = await Promise.all([
      prisma.candidateProfile.findUnique({
        where: { userId },
        select: {
          personalDetails: true,
          experience: true,
          education: true,
          skills: true,
          certifications: true,
          confirmedAt: true,
        },
      }),
      prisma.candidateApplicationProfile.findUnique({
        where: { userId },
        select: { links: true },
      }),
    ]);
    return profile ? { ...profile, links: overlay?.links } : null;
  }
}

export const prismaCandidateProfileContextRepository =
  new PrismaCandidateProfileContextRepository();
