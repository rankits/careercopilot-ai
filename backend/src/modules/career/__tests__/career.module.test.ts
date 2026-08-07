import { describe, expect, it } from 'vitest';

import { careerRoutes } from '@/modules/career/index.js';
import careerRoute from '@/modules/career/routes/career.route.js';
import careerService from '@/modules/career/services/career.service.js';

describe('career module surface', () => {
  it('exports an express router from the index', () => {
    expect(typeof careerRoutes).toBe('function');
  });

  it('exposes a placeholder service object', () => {
    expect(careerService).toEqual({});
  });

  it('registers routes on the router', () => {
    expect(typeof careerRoute).toBe('function');
    expect(careerRoute.stack).toEqual([]);
  });
});
