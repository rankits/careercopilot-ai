import { IApplicationRuleRepository } from '@/modules/auto-apply/contracts/application-rule.contract.js';
import { ApplicationRuleDto } from '@/modules/auto-apply/types/application-rule.types.js';
import { UpsertApplicationRuleInput } from '@/modules/auto-apply/validations/application-rule.validation.js';

export class ApplicationRuleService {
  constructor(private readonly repository: IApplicationRuleRepository) {}

  async getRule(userId: string): Promise<ApplicationRuleDto | null> {
    return this.repository.findByUserId(userId);
  }

  async upsertRule(userId: string, input: UpsertApplicationRuleInput): Promise<ApplicationRuleDto> {
    return this.repository.upsert(userId, input);
  }

  async pauseAutopilot(userId: string): Promise<ApplicationRuleDto> {
    return this.repository.setPaused(userId, true);
  }

  async resumeAutopilot(userId: string): Promise<ApplicationRuleDto> {
    return this.repository.setPaused(userId, false);
  }
}
