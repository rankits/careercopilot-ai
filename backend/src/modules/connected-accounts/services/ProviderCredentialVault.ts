import crypto from 'node:crypto';
import { env } from '@/shared/config/env.conf.js';

export interface EncryptedSecret {
  version: number;
  keyId: string;
  algorithm: 'aes-256-gcm';
  iv: string; // base64
  ciphertext: string; // base64
  authTag: string; // base64
}

export interface EncryptedSecretContext {
  userId: number;
  provider: string;
  providerAccountId: string;
  credentialType: 'refresh_token' | 'access_token';
}

export class ProviderCredentialVault {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly VERSION = 1;

  /**
   * Encrypts a plaintext secret (e.g. refresh token) using AES-256-GCM.
   * Binds the ciphertext to the provided context using Additional Authenticated Data (AAD).
   */
  public static encrypt(plaintext: string, context: EncryptedSecretContext): EncryptedSecret {
    if (!env.GOOGLE_TOKEN_ENCRYPTION_KEY) {
      throw new Error('Encryption key not configured');
    }

    const key = Buffer.from(env.GOOGLE_TOKEN_ENCRYPTION_KEY, 'base64');
    if (key.length !== 32) {
      throw new Error('Invalid encryption key length');
    }

    const iv = crypto.randomBytes(12); // Standard for GCM
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    // Bind context as AAD
    const aad = this.buildAad(context);
    cipher.setAAD(aad);

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    return {
      version: this.VERSION,
      keyId: env.GOOGLE_TOKEN_ENCRYPTION_KEY_ID || 'v1',
      algorithm: this.ALGORITHM,
      iv: iv.toString('base64'),
      ciphertext,
      authTag,
    };
  }

  /**
   * Decrypts an EncryptedSecret.
   * Fails if the payload was tampered with or if the AAD context doesn't match.
   */
  public static decrypt(secret: EncryptedSecret, context: EncryptedSecretContext): string {
    if (!env.GOOGLE_TOKEN_ENCRYPTION_KEY) {
      throw new Error('Encryption key not configured');
    }

    if (secret.algorithm !== this.ALGORITHM) {
      throw new Error(`Unsupported algorithm: ${secret.algorithm}`);
    }

    // In a real multi-key rotation setup, we'd lookup the key by secret.keyId
    // For now, we only have one key configured in env.
    const key = Buffer.from(env.GOOGLE_TOKEN_ENCRYPTION_KEY, 'base64');
    const iv = Buffer.from(secret.iv, 'base64');
    const authTag = Buffer.from(secret.authTag, 'base64');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);

    const aad = this.buildAad(context);
    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);

    try {
      let plaintext = decipher.update(secret.ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');
      return plaintext;
    } catch (err) {
      throw new Error('Decryption failed: integrity check or AAD mismatch');
    }
  }

  private static buildAad(context: EncryptedSecretContext): Buffer {
    return Buffer.from(
      JSON.stringify({
        u: context.userId,
        p: context.provider,
        id: context.providerAccountId,
        t: context.credentialType,
      }),
    );
  }
}
