import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { securityConfig } from "../config/security.conf.js";

const scryptAsync = promisify(scrypt);

const SALT_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 64;

export interface HashedPassword {
  passwordHash: string;
  passwordSalt: string;
}

/**
 * Password hashing shared by both the `admin` and `user` principals (each
 * stores `passwordHash`/`passwordSalt` as separate columns on its own
 * *Meta table). Uses Node's built-in scrypt rather than bcrypt so the
 * separate salt column is load-bearing rather than vestigial: bcrypt
 * embeds its salt inside the hash string itself and would leave a
 * `passwordSalt` column meaningless.
 *
 * scrypt is used with a random 16-byte salt per password, a 64-byte
 * derived key, and a timing-safe comparison on verify - the same
 * properties a hand-rolled bcrypt/argon2 integration would need, without
 * adding a native-module dependency.
 */
export const PasswordUtil = {
  async hash(plain: string): Promise<HashedPassword> {
    const passwordSalt = randomBytes(SALT_LENGTH_BYTES).toString("hex");
    const derivedKey = (await scryptAsync(plain, passwordSalt, KEY_LENGTH_BYTES)) as Buffer;
    return { passwordHash: derivedKey.toString("hex"), passwordSalt };
  },

  async verify(plain: string, hash: string, salt: string): Promise<boolean> {
    const storedHash = Buffer.from(hash, "hex");
    const derivedKey = (await scryptAsync(plain, salt, KEY_LENGTH_BYTES)) as Buffer;

    // A corrupt/foreign hash value must never reach timingSafeEqual, which
    // throws (rather than returning false) on a buffer length mismatch.
    if (storedHash.length !== derivedKey.length) return false;

    return timingSafeEqual(storedHash, derivedKey);
  },

  meetsPolicy(plain: string): boolean {
    return (
      plain.length >= securityConfig.password.minLength &&
      securityConfig.password.policyRegex.test(plain)
    );
  },
};
