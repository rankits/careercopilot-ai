import { describe, expect, it } from 'vitest';

import { notificationsRoutes } from '@/modules/notifications/index.js';
import notificationsRoute from '@/modules/notifications/routes/notifications.route.js';
import notificationsService from '@/modules/notifications/services/notifications.service.js';

describe('notifications module surface', () => {
  it('exports an express router from the index', () => {
    expect(typeof notificationsRoutes).toBe('function');
  });

  it('exposes a placeholder service object', () => {
    expect(notificationsService).toEqual({});
  });

  it('registers routes on the router', () => {
    expect(typeof notificationsRoute).toBe('function');
    expect(notificationsRoute.stack).toEqual([]);
  });
});
