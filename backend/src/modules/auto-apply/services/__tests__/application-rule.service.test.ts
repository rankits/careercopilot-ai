import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApplicationRuleService } from '@/modules/auto-apply/services/application-rule.service.js';
import { IApplicationRuleRepository } from '@/modules/auto-apply/contracts/application-rule.contract.js';
import { ApplicationRuleDto } from '@/modules/auto-apply/types/application-rule.types.js';

describe('ApplicationRuleService', () => {
  let mockRepo: IApplicationRuleRepository;
  let service: ApplicationRuleService;

  const mockRule: ApplicationRuleDto = {
    id: 'rule-1',
    userId: 'user-1',
    minMatchScore: 0.85,
    dailyApplicationLimit: 5,
    weeklyApplicationLimit: null,
    blacklistedCompanySlugs: [],
    excludedTitleKeywords: [],
    excludedSources: [],
    autopilotEnabled: false,
    autopilotPausedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockRule),
      upsert: vi.fn().mockResolvedValue(mockRule),
      setPaused: vi.fn().mockResolvedValue({ ...mockRule, autopilotPausedAt: new Date() }),
    };
    service = new ApplicationRuleService(mockRepo);
  });

  it('pauses autopilot via setPaused(true)', async () => {
    await service.pauseAutopilot('user-1');
    expect(mockRepo.setPaused).toHaveBeenCalledWith('user-1', true);
  });

  it('resumes autopilot via setPaused(false)', async () => {
    await service.resumeAutopilot('user-1');
    expect(mockRepo.setPaused).toHaveBeenCalledWith('user-1', false);
  });

  it('delegates upsert to the repository', async () => {
    await service.upsertRule('user-1', { dailyApplicationLimit: 3 });
    expect(mockRepo.upsert).toHaveBeenCalledWith('user-1', { dailyApplicationLimit: 3 });
  });
});
