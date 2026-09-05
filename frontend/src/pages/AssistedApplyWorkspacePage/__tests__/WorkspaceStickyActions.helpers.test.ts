import { describe, expect, it } from 'vitest';

import { assistedApplyTouchTargetSx } from '../WorkspaceStickyActions';

describe('WorkspaceStickyActions helpers (AA-081)', () => {
  it('exposes ≥44px touch target sx', () => {
    expect(assistedApplyTouchTargetSx).toMatchObject({
      minHeight: 44,
      minWidth: 44,
    });
  });
});
