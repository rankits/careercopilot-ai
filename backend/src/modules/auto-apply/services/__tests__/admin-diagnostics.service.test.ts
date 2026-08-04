import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminDiagnosticsService } from '@/modules/auto-apply/services/admin-diagnostics.service.js';
import { IAdminDiagnosticsRepository } from '@/modules/auto-apply/contracts/admin-diagnostics.contract.js';

describe('AdminDiagnosticsService', () => {
  let repository: IAdminDiagnosticsRepository;
  let service: AdminDiagnosticsService;

  beforeEach(() => {
    repository = { findStuckSubmissions: vi.fn().mockResolvedValue([]) };
    service = new AdminDiagnosticsService(repository);
  });

  it('applies default thresholds when none are provided', async () => {
    await service.getStuckSubmissions();
    expect(repository.findStuckSubmissions).toHaveBeenCalledWith({
      queueStalledAfterMinutes: 15,
      awaitingConfirmationAfterDays: 7,
    });
  });

  it('overrides only the thresholds explicitly provided', async () => {
    await service.getStuckSubmissions({ queueStalledAfterMinutes: 30 });
    expect(repository.findStuckSubmissions).toHaveBeenCalledWith({
      queueStalledAfterMinutes: 30,
      awaitingConfirmationAfterDays: 7,
    });
  });

  it('falls back to defaults even when the caller passes both keys as explicit undefined (the real controller always does this)', async () => {
    await service.getStuckSubmissions({
      queueStalledAfterMinutes: undefined,
      awaitingConfirmationAfterDays: undefined,
    });
    expect(repository.findStuckSubmissions).toHaveBeenCalledWith({
      queueStalledAfterMinutes: 15,
      awaitingConfirmationAfterDays: 7,
    });
  });
});
