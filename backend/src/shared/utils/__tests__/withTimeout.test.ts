import { describe, expect, it } from 'vitest';
import { withTimeout, TimeoutError } from '@/shared/utils/withTimeout.js';

describe('withTimeout', () => {
  it('resolves with the operation result when it finishes before the deadline', async () => {
    const result = await withTimeout(Promise.resolve('done'), 100, 'test-op');
    expect(result).toBe('done');
  });

  it('rejects with TimeoutError when the operation takes longer than the deadline', async () => {
    const neverResolves = new Promise(() => {
      /* intentionally never settles */
    });

    await expect(withTimeout(neverResolves, 10, 'slow-op')).rejects.toThrow(TimeoutError);
  });

  it("propagates the operation's own rejection when it fails before the deadline", async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 100, 'failing-op')).rejects.toThrow(
      'boom',
    );
  });

  it('includes the operation name and duration in the timeout error message', async () => {
    const neverResolves = new Promise(() => undefined);
    await expect(withTimeout(neverResolves, 10, 'submit-application')).rejects.toThrow(
      /submit-application.*10ms/,
    );
  });
});
