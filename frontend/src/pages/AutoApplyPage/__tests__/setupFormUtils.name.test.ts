import { describe, expect, it } from 'vitest';

import { splitFullName, validateBasicIdentityFields, validateFullName } from '../setupFormUtils';

describe('setupFormUtils name validation', () => {
  it('splitFullName keeps a single token in firstName only', () => {
    expect(splitFullName('Madonna')).toEqual({ firstName: 'Madonna', lastName: '' });
  });

  it('validateFullName requires both first and last name', () => {
    expect(validateFullName('')).toBe('Enter your full name.');
    expect(validateFullName('Madonna')).toBe('Please enter both your first and last name.');
    expect(validateFullName('Jane Doe')).toBeUndefined();
  });

  it('validateBasicIdentityFields accepts empty optional fields', () => {
    expect(validateBasicIdentityFields({ preferredName: '', authorizationCountry: '' })).toEqual(
      {},
    );
  });

  it('validateBasicIdentityFields validates country code format when provided', () => {
    expect(validateBasicIdentityFields({ preferredName: '', authorizationCountry: 'USA' })).toEqual(
      {
        authorizationCountry: 'Enter a 2-letter country code, e.g. US.',
      },
    );
  });
});
