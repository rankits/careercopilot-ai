import { describe, expect, it } from 'vitest';
import { PasswordUtil } from '@/shared/security/password.util.js';

describe('PasswordUtil', () => {
  it('hashes a password producing a 64-byte hex hash and 16-byte hex salt', async () => {
    const { passwordHash, passwordSalt } = await PasswordUtil.hash('correct horse battery staple');
    expect(passwordHash).toMatch(/^[0-9a-f]{128}$/);
    expect(passwordSalt).toMatch(/^[0-9a-f]{32}$/);
  });

  it('verifies a correct password against its stored hash and salt', async () => {
    const { passwordHash, passwordSalt } = await PasswordUtil.hash('S3cret!pw');
    await expect(PasswordUtil.verify('S3cret!pw', passwordHash, passwordSalt)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const { passwordHash, passwordSalt } = await PasswordUtil.hash('S3cret!pw');
    await expect(PasswordUtil.verify('wrong-password', passwordHash, passwordSalt)).resolves.toBe(
      false,
    );
  });

  it('returns false (not throws) when the stored hash length is mismatched', async () => {
    // A 1-byte buffer from 'abcd' compared against a 64-byte derived key must
    // short-circuit to false instead of reaching timingSafeEqual.
    await expect(PasswordUtil.verify('S3cret!pw', 'abcd', '0123456789abcdef')).resolves.toBe(false);
  });

  describe('meetsPolicy', () => {
    it('accepts a password meeting length and complexity requirements', () => {
      expect(PasswordUtil.meetsPolicy('Abcd123!')).toBe(true);
      expect(PasswordUtil.meetsPolicy('Longer$Passw0rd')).toBe(true);
    });

    it('rejects a password shorter than the minimum length', () => {
      expect(PasswordUtil.meetsPolicy('Ab1!')).toBe(false);
    });

    it('rejects a password missing an uppercase letter', () => {
      expect(PasswordUtil.meetsPolicy('abcd123!')).toBe(false);
    });

    it('rejects a password missing a digit', () => {
      expect(PasswordUtil.meetsPolicy('Abcdefg!')).toBe(false);
    });

    it('rejects a password missing a symbol', () => {
      expect(PasswordUtil.meetsPolicy('Abcdef12')).toBe(false);
    });

    it('rejects a password missing a lowercase letter', () => {
      expect(PasswordUtil.meetsPolicy('ABCDEF12!')).toBe(false);
    });
  });
});
