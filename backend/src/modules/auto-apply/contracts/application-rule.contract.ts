import { ApplicationRuleDto } from '@/modules/auto-apply/types/application-rule.types.js';
import { UpsertApplicationRuleInput } from '@/modules/auto-apply/validations/application-rule.validation.js';

export interface IApplicationRuleRepository {
  findByUserId(userId: string): Promise<ApplicationRuleDto | null>;
  upsert(userId: string, input: UpsertApplicationRuleInput): Promise<ApplicationRuleDto>;
  setPaused(userId: string, paused: boolean): Promise<ApplicationRuleDto>;
}
