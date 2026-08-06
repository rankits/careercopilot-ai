import { describe, expect, it } from 'vitest';

import { interviewsRoutes } from '@/modules/interviews/index.js';
import interviewsRoute from '@/modules/interviews/routes/interviews.route.js';
import interviewsService from '@/modules/interviews/services/interviews.service.js';

describe('interviews module surface', () => {
  it('exports an express router from the index', () => {
    expect(typeof interviewsRoutes).toBe('function');
  });

  it('exposes a placeholder service object', () => {
    expect(interviewsService).toEqual({});
  });

  it('registers routes on the router', () => {
    expect(typeof interviewsRoute).toBe('function');
    expect(interviewsRoute.stack).toEqual([]);
  });
});
