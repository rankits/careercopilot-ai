import { describe, expect, it } from 'vitest';

import {
  InvalidMailDraftTransitionError,
  assertMailDraftTransition,
  canTransitionMailDraft,
} from '@/modules/ai-mail/domain/draft-state-machine.js';

describe('AI Mail draft state machine', () => {
  it('supports the generation and approval lifecycle', () => {
    expect(canTransitionMailDraft('input', 'generating')).toBe(true);
    expect(canTransitionMailDraft('generating', 'generated')).toBe(true);
    expect(canTransitionMailDraft('generated', 'edited')).toBe(true);
    expect(canTransitionMailDraft('edited', 'ready_to_send')).toBe(true);
  });

  it('supports retrying a failed generation', () => {
    expect(canTransitionMailDraft('generating', 'generation_failed')).toBe(true);
    expect(canTransitionMailDraft('generation_failed', 'generating')).toBe(true);
  });

  it('returns a ready draft to edited when its content changes', () => {
    expect(canTransitionMailDraft('ready_to_send', 'edited')).toBe(true);
    expect(canTransitionMailDraft('ready_to_send', 'generating')).toBe(false);
  });

  it('prevents invalid and post-archive transitions', () => {
    expect(() => assertMailDraftTransition('input', 'generated')).toThrow(
      InvalidMailDraftTransitionError,
    );
    expect(canTransitionMailDraft('archived', 'input')).toBe(false);
  });

  it('allows every non-generating active state to archive', () => {
    for (const status of [
      'input',
      'generated',
      'edited',
      'generation_failed',
      'ready_to_send',
    ] as const) {
      expect(canTransitionMailDraft(status, 'archived')).toBe(true);
    }
    expect(canTransitionMailDraft('generating', 'archived')).toBe(false);
  });
});
