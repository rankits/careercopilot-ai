import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ProviderCredentialVault,
  EncryptedSecretContext,
} from '@/modules/connected-accounts/services/ProviderCredentialVault.js';
import { env } from '@/shared/config/env.conf.js';

describe('ProviderCredentialVault', () => {
  const mockKey = Buffer.alloc(32, 'a').toString('base64');

  beforeEach(() => {
    env.GOOGLE_TOKEN_ENCRYPTION_KEY = mockKey;
    env.GOOGLE_TOKEN_ENCRYPTION_KEY_ID = 'test-v1';
  });

  it('encrypts and decrypts a secret correctly', () => {
    const plaintext = 'test-refresh-token-123';
    const context: EncryptedSecretContext = {
      userId: 1,
      provider: 'GOOGLE',
      providerAccountId: 'sub-123',
      credentialType: 'refresh_token',
    };

    const encrypted = ProviderCredentialVault.encrypt(plaintext, context);

    expect(encrypted).toHaveProperty('ciphertext');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('authTag');
    expect(encrypted.keyId).toBe('test-v1');

    const decrypted = ProviderCredentialVault.decrypt(encrypted, context);
    expect(decrypted).toBe(plaintext);
  });

  it('fails decryption if context AAD changes', () => {
    const plaintext = 'test-refresh-token-123';
    const context: EncryptedSecretContext = {
      userId: 1,
      provider: 'GOOGLE',
      providerAccountId: 'sub-123',
      credentialType: 'refresh_token',
    };

    const encrypted = ProviderCredentialVault.encrypt(plaintext, context);

    const wrongContext = { ...context, userId: 2 };

    expect(() => ProviderCredentialVault.decrypt(encrypted, wrongContext)).toThrowError(
      'Decryption failed: integrity check or AAD mismatch',
    );
  });

  it('fails decryption if ciphertext is tampered', () => {
    const plaintext = 'test-refresh-token-123';
    const context: EncryptedSecretContext = {
      userId: 1,
      provider: 'GOOGLE',
      providerAccountId: 'sub-123',
      credentialType: 'refresh_token',
    };

    const encrypted = ProviderCredentialVault.encrypt(plaintext, context);

    // Tamper with ciphertext reliably
    const buf = Buffer.from(encrypted.ciphertext, 'base64');
    buf[0] ^= 1; // flip a bit
    const tampered = { ...encrypted, ciphertext: buf.toString('base64') };

    expect(() => ProviderCredentialVault.decrypt(tampered, context)).toThrowError(
      'Decryption failed: integrity check or AAD mismatch',
    );
  });
});
