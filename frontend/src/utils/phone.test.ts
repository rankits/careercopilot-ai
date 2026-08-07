import { describe, expect, it } from 'vitest';

import {
  isValidPhoneNumber,
  sanitizePhoneInput,
  sanitizeRegisterNationalPhoneInput,
} from './phone';

describe('phone utils', () => {
  it('preserves +91 and strips formatting characters', () => {
    expect(sanitizePhoneInput('+91 98765-43210')).toBe('+919876543210');
    expect(sanitizePhoneInput('9876543210')).toBe('9876543210');
  });

  it('accepts 10-digit and +91 numbers', () => {
    expect(isValidPhoneNumber('9876543210')).toBe(true);
    expect(isValidPhoneNumber('+919876543210')).toBe(true);
    expect(isValidPhoneNumber('123')).toBe(false);
  });

  it('limits register national phone to 10 digits and strips pasted country code', () => {
    expect(sanitizeRegisterNationalPhoneInput('9876543210', '+91')).toBe('9876543210');
    expect(sanitizeRegisterNationalPhoneInput('+91 98765-43210', '+91')).toBe('9876543210');
    expect(sanitizeRegisterNationalPhoneInput('919876543210', '+91')).toBe('9876543210');
    expect(sanitizeRegisterNationalPhoneInput('12345678901234', '+91')).toBe('1234567890');
  });
});
