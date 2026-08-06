import { describe, expect, it } from 'vitest';

import { copilotRoutes, copilotService } from '@/modules/copilot/index.js';

describe('copilot module index', () => {
  it('re-exports the chat route', () => {
    expect(typeof copilotRoutes).toBe('function');
  });

  it('re-exports the copilot service', () => {
    expect(typeof copilotService.chat).toBe('function');
  });
});
