import { describe, expect, it } from 'vitest';

import { borderWidth, fontSize, sizing, spacing, tokens } from './index';

describe('design tokens', () => {
  it('provides reusable border, display typography, spacing, and sizing values', () => {
    expect(borderWidth.thin).toBe('0.0625rem');
    expect(fontSize['4xl']).toBe('2.5rem');
    expect(fontSize['7xl']).toBe('3.25rem');
    expect(spacing[22]).toBe('5.5rem');
    expect(spacing[36]).toBe('9rem');
    expect(sizing[12.5]).toBe('12.5rem');
    expect(sizing[100]).toBe('100rem');
  });

  it('exposes the additions through the combined token object', () => {
    expect(tokens.borderWidth).toBe(borderWidth);
    expect(tokens.sizing).toBe(sizing);
  });
});
