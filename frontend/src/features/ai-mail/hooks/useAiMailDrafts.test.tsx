import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import axios from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { aiMailQueryKeys } from '../queryKeys';
import { AI_MAIL_VERSION_CONFLICT_MESSAGE, AiMailClientError } from '../utils/apiError';

import { useUpdateAiMailDraft } from './useAiMailDrafts';

const { updateDraftMock } = vi.hoisted(() => ({ updateDraftMock: vi.fn() }));

vi.mock('../services/aiMail.service', () => ({
  aiMailService: {
    updateDraft: updateDraftMock,
  },
}));

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('AI Mail draft hooks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalidates draft lists and detail after saving', async () => {
    updateDraftMock.mockResolvedValue({ id: 'draft-1' });
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateAiMailDraft('draft-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ version: 2, subject: 'Hello' });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: aiMailQueryKeys.lists() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: aiMailQueryKeys.detail('draft-1') });
  });

  it('normalizes a version conflict into the typed client error', async () => {
    updateDraftMock.mockRejectedValue(
      new axios.AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
        data: {
          code: 'AI_MAIL_DRAFT_VERSION_CONFLICT',
          message: 'AI Mail draft version conflict',
        },
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config: { headers: {} } as never,
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useUpdateAiMailDraft('draft-1'), { wrapper });

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync({ version: 1, subject: 'Stale' });
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toBeInstanceOf(AiMailClientError);
    expect(thrown).toMatchObject({
      code: 'AI_MAIL_DRAFT_VERSION_CONFLICT',
      message: AI_MAIL_VERSION_CONFLICT_MESSAGE,
      statusCode: 409,
    });
  });
});
