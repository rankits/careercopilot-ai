import {
  AutoApplyAuditEventDto,
  AutoApplyEventType,
} from '@/modules/auto-apply/types/audit-event.types.js';

export interface RecordAuditEventData {
  userId: string;
  eventType: AutoApplyEventType;
  jobApplicationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ListAuditEventsFilter {
  jobApplicationId?: string;
}

export interface IAutoApplyEventRepository {
  record(data: RecordAuditEventData): Promise<AutoApplyAuditEventDto>;
  findManyByUserId(
    userId: string,
    limit: number,
    filter?: ListAuditEventsFilter,
  ): Promise<AutoApplyAuditEventDto[]>;
}

export interface IAutoApplyEventService {
  /** Fire-and-forget by design — a logging failure must never fail the
   * action it's recording. Callers should not `await` a rejection out of
   * this in a way that surfaces to the user. */
  record(data: RecordAuditEventData): Promise<void>;
  listForUser(
    userId: string,
    limit?: number,
    filter?: ListAuditEventsFilter,
  ): Promise<AutoApplyAuditEventDto[]>;
}
