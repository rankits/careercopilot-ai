import { randomUUID } from 'node:crypto';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const OPERATION_ID_HEADER = 'x-operation-id';

/** True only for well-formed UUID v4 strings (rejects empty / injection-prone values). */
export function isValidOperationId(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4_RE.test(value.trim());
}

/**
 * AA-014: honor a valid client `X-Operation-Id`, otherwise mint a fresh UUID v4.
 * Malformed values are never trusted into logs.
 */
export function resolveOperationId(incoming: unknown): string {
  if (typeof incoming === 'string' && isValidOperationId(incoming.trim())) {
    return incoming.trim();
  }
  if (Array.isArray(incoming) && incoming.length > 0) {
    return resolveOperationId(incoming[0]);
  }
  return randomUUID();
}
