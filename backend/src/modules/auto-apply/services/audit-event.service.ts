import { logger } from '@/shared/logger/logger.js';
import {
  IAutoApplyEventRepository,
  IAutoApplyEventService,
  RecordAuditEventData,
} from '@/modules/auto-apply/contracts/audit-event.contract.js';
import { AutoApplyAuditEventDto } from '@/modules/auto-apply/types/audit-event.types.js';

const DEFAULT_LIST_LIMIT = 50;

/**
 * Implements AJA-OBS-001's audit-trail half. `record` deliberately never
 * throws — a logging failure must not fail the plan/approval/submission
 * action it's describing. Callers fire it without awaiting a rejection
 * path; failures are logged, not surfaced.
 */
export class AutoApplyEventService implements IAutoApplyEventService {
  constructor(private readonly repository: IAutoApplyEventRepository) {}

  async record(data: RecordAuditEventData): Promise<void> {
    try {
      await this.repository.record(data);
    } catch (error) {
      logger.error(
        { err: error, eventType: data.eventType },
        'Failed to record auto-apply audit event',
      );
    }
  }

  async listForUser(
    userId: string,
    limit: number = DEFAULT_LIST_LIMIT,
  ): Promise<AutoApplyAuditEventDto[]> {
    return this.repository.findManyByUserId(userId, limit);
  }
}
