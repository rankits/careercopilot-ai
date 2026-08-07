/**
 * AA-092 — deterministic cohort rollout for Assisted Apply flags.
 * Same userId always lands in the same bucket (stable across requests).
 */

export interface RolloutConfig {
  /** 0–100. 100 = everyone (when allowlist empty). 0 = allowlist-only. */
  percent: number;
  /** Explicit user ids always included, regardless of percent. */
  allowlist: readonly string[];
}

/** FNV-1a 32-bit → stable 0–99 bucket for a user id. */
export function rolloutBucket(userId: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < userId.length; i += 1) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 100;
}

export function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.min(100, Math.max(0, Math.floor(value)));
}

/**
 * Global kill switch is checked by the caller.
 * When allowlisted → true.
 * Else when percent >= 100 → true.
 * Else when percent <= 0 → false (unless allowlisted).
 * Else bucket < percent → true.
 */
export function isUserInRollout(userId: string, config: RolloutConfig): boolean {
  if (!userId) return false;
  if (config.allowlist.includes(userId)) return true;
  const percent = clampPercent(config.percent);
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  return rolloutBucket(userId) < percent;
}
