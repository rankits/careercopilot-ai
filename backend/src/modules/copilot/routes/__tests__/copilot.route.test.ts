import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/middlewares/auth.middleware.js', () => ({
  authMiddleware: vi.fn(),
  optionalAuthMiddleware: vi.fn(),
}));

vi.mock('@/shared/middlewares/rbac.middleware.js', () => ({
  requirePermission: vi.fn(() => vi.fn()),
  requirePrincipalType: vi.fn(() => vi.fn()),
}));

vi.mock('@/shared/middlewares/validateResource.js', () => ({
  validateResource: vi.fn(() => vi.fn()),
}));

import router from '@/modules/copilot/routes/copilot.route.js';
import { chatController } from '@/modules/copilot/controllers/copilot.controller.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';

describe('copilot routes', () => {
  it('exports an express router', () => {
    expect(typeof router).toBe('function');
  });

  it('registers a POST /chat route with auth, rbac, validation, and the chat controller', () => {
    expect(router.stack.some((layer) => (layer.route?.path as string) === '/chat')).toBe(true);
    expect(requirePrincipalType).toHaveBeenCalledWith('USER');
    expect(requirePermission).toHaveBeenCalledWith(expect.any(String));
    expect(validateResource).toHaveBeenCalledWith(expect.any(Object));

    const chatLayer = router.stack.find((layer) => (layer.route?.path as string) === '/chat');
    const handlers = chatLayer?.route?.stack?.map((item) => item.handle) ?? [];
    expect(handlers).toContain(authMiddleware);
    expect(handlers).toContain(chatController);
  });
});
