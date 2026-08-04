import {
  IAdminDiagnosticsRepository,
  IAdminDiagnosticsService,
  StuckSubmissionsQuery,
} from '@/modules/auto-apply/contracts/admin-diagnostics.contract.js';
import { StuckSubmissionDto } from '@/modules/auto-apply/types/admin-diagnostics.types.js';

const DEFAULT_QUERY: StuckSubmissionsQuery = {
  queueStalledAfterMinutes: 15,
  awaitingConfirmationAfterDays: 7,
};

/** Implements AJA-OBS-002. Cross-user by design — this is the one
 * legitimate admin-only exception to the "own"-scoped pattern every other
 * auto-apply resource follows. */
export class AdminDiagnosticsService implements IAdminDiagnosticsService {
  constructor(private readonly repository: IAdminDiagnosticsRepository) {}

  async getStuckSubmissions(query?: Partial<StuckSubmissionsQuery>): Promise<StuckSubmissionDto[]> {
    // Per-field `??` rather than object-spread merging — the controller
    // always passes both keys (possibly `undefined` when the query param
    // was omitted), and `{...DEFAULT_QUERY, ...query}` would let an
    // explicit `undefined` silently overwrite a real default instead of
    // falling back to it.
    const merged: StuckSubmissionsQuery = {
      queueStalledAfterMinutes:
        query?.queueStalledAfterMinutes ?? DEFAULT_QUERY.queueStalledAfterMinutes,
      awaitingConfirmationAfterDays:
        query?.awaitingConfirmationAfterDays ?? DEFAULT_QUERY.awaitingConfirmationAfterDays,
    };
    return this.repository.findStuckSubmissions(merged);
  }
}
