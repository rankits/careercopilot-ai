import { prisma } from '@/shared/config/db.conf.js';
import { IApplicationRuleRepository } from '@/modules/auto-apply/contracts/application-rule.contract.js';
import {
  ApplicationRuleDto,
  DEFAULT_APPLICATION_RULE,
} from '@/modules/auto-apply/types/application-rule.types.js';
import { UpsertApplicationRuleInput } from '@/modules/auto-apply/validations/application-rule.validation.js';

function toDto(record: {
  id: string;
  userId: string;
  minMatchScore: number;
  dailyApplicationLimit: number;
  weeklyApplicationLimit: number | null;
  blacklistedCompanySlugs: string[];
  excludedTitleKeywords: string[];
  excludedSources: string[];
  autopilotEnabled: boolean;
  autopilotPausedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ApplicationRuleDto {
  return { ...record };
}

export class PrismaApplicationRuleRepository implements IApplicationRuleRepository {
  async findByUserId(userId: string): Promise<ApplicationRuleDto | null> {
    const record = await prisma.applicationRule.findUnique({ where: { userId } });
    return record ? toDto(record) : null;
  }

  async upsert(userId: string, input: UpsertApplicationRuleInput): Promise<ApplicationRuleDto> {
    const record = await prisma.applicationRule.upsert({
      where: { userId },
      create: {
        userId,
        minMatchScore: input.minMatchScore ?? DEFAULT_APPLICATION_RULE.minMatchScore,
        dailyApplicationLimit:
          input.dailyApplicationLimit ?? DEFAULT_APPLICATION_RULE.dailyApplicationLimit,
        weeklyApplicationLimit: input.weeklyApplicationLimit ?? undefined,
        blacklistedCompanySlugs: input.blacklistedCompanySlugs ?? [],
        excludedTitleKeywords: input.excludedTitleKeywords ?? [],
        excludedSources: input.excludedSources ?? [],
      },
      update: {
        ...(input.minMatchScore !== undefined && { minMatchScore: input.minMatchScore }),
        ...(input.dailyApplicationLimit !== undefined && {
          dailyApplicationLimit: input.dailyApplicationLimit,
        }),
        ...(input.weeklyApplicationLimit !== undefined && {
          weeklyApplicationLimit: input.weeklyApplicationLimit,
        }),
        ...(input.blacklistedCompanySlugs !== undefined && {
          blacklistedCompanySlugs: input.blacklistedCompanySlugs,
        }),
        ...(input.excludedTitleKeywords !== undefined && {
          excludedTitleKeywords: input.excludedTitleKeywords,
        }),
        ...(input.excludedSources !== undefined && { excludedSources: input.excludedSources }),
      },
    });
    return toDto(record);
  }

  async setPaused(userId: string, paused: boolean): Promise<ApplicationRuleDto> {
    const record = await prisma.applicationRule.upsert({
      where: { userId },
      create: {
        userId,
        minMatchScore: DEFAULT_APPLICATION_RULE.minMatchScore,
        dailyApplicationLimit: DEFAULT_APPLICATION_RULE.dailyApplicationLimit,
        autopilotPausedAt: paused ? new Date() : null,
      },
      update: {
        autopilotPausedAt: paused ? new Date() : null,
      },
    });
    return toDto(record);
  }
}
