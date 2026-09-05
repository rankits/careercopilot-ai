import { describe, expect, it, vi } from 'vitest';
import { AssistedApplyHandoffService } from '@/modules/auto-apply/services/assisted-apply-handoff.service.js';

describe('handoff zero-RabbitMQ canary (AA-092)', () => {
  it('never invokes queuePublish when constructing / checking flag', () => {
    const publish = vi.fn();
    const service = new AssistedApplyHandoffService({} as never, {} as never, {} as never, {
      publish,
    });
    void service.isDirectHandoffEnabled('canary-user');
    expect(publish).not.toHaveBeenCalled();
  });
});
