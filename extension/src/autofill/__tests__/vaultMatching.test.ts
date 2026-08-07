import { describe, it, expect } from 'vitest';
import { matchFieldToVaultKey } from '../vaultMatching';

describe('vaultMatching', () => {
  it('matches years of experience', () => {
    expect(
      matchFieldToVaultKey({ label: 'How many years of experience do you have with TypeScript?' }),
    ).toBe('years_of_experience');
    expect(matchFieldToVaultKey({ label: 'Years of Experience' })).toBe('years_of_experience');
  });

  it('matches github url', () => {
    expect(matchFieldToVaultKey({ label: 'GitHub Profile', name: 'github' })).toBe('github_url');
  });

  it('matches linkedin url', () => {
    expect(matchFieldToVaultKey({ label: 'LinkedIn Profile' })).toBe('linkedin_url');
  });

  it('matches portfolio url', () => {
    expect(matchFieldToVaultKey({ label: 'Portfolio Website' })).toBe('portfolio_url');
  });

  it('matches first name and last name', () => {
    expect(matchFieldToVaultKey({ label: 'First Name' })).toBe('first_name');
    expect(matchFieldToVaultKey({ label: 'Last Name' })).toBe('last_name');
  });

  it('returns null for unknown fields', () => {
    expect(matchFieldToVaultKey({ label: 'What is your favorite color?' })).toBeNull();
  });
});
