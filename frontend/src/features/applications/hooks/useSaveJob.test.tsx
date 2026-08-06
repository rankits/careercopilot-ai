import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { useSaveJob } from './useSaveJob';

const { saveJobMock, unsaveJobMock } = vi.hoisted(() => ({
  saveJobMock: vi.fn(),
  unsaveJobMock: vi.fn(),
}));

vi.mock('@/features/applications/services/applications.service', () => ({
  applicationsService: {
    saveJob: saveJobMock,
    unsaveJob: unsaveJobMock,
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    );
  };
}

describe('useSaveJob', () => {
  beforeEach(() => {
    saveJobMock.mockReset();
    saveJobMock.mockResolvedValue(undefined);
    unsaveJobMock.mockReset();
    unsaveJobMock.mockResolvedValue(undefined);
  });

  it('shows a success toast after saving a job', async () => {
    const { result } = renderHook(() => useSaveJob(), { wrapper: createWrapper() });

    await result.current.saveJob('job-1');

    await waitFor(() => {
      expect(document.body).toHaveTextContent(/job saved successfully/i);
    });
    expect(saveJobMock).toHaveBeenCalledWith('job-1');
  });
});
