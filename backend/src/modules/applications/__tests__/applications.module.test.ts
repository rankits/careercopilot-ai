import { describe, expect, it } from 'vitest';

import { applicationsRoutes } from '@/modules/applications/index.js';
import applicationsRoute from '@/modules/applications/routes/applications.route.js';
import applicationsService from '@/modules/applications/services/applications.service.js';

describe('applications module surface', () => {
  it('exports an express router from the index', () => {
    expect(typeof applicationsRoutes).toBe('function');
  });

  it('exposes a placeholder service object', () => {
    expect(applicationsService).toEqual({});
  });

  it('registers routes on the router', () => {
    expect(typeof applicationsRoute).toBe('function');
    expect(applicationsRoute.stack).toEqual([]);
  });
});
