import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AutoApplyClientError } from '../utils/apiError';

import { useTrackAndOpenApply } from './useTrackAndOpenApply';

const { initiateMock, openExternalApplyMock, showToastMock, navigateMock } = vi.hoisted(() => ({
  initiateMock: vi.fn(),
  openExternalApplyMock: vi.fn(),
  showToastMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('./useSubmissions', () => ({
  useInitiateSubmission: () => ({
    mutateAsync: initiateMock,
    isPending: false,
  }),
}));

vi.mock('@/features/jobs/utils/openExternalApply', () => ({
  openExternalApply: openExternalApplyMock,
}));

vi.mock('@/components/organisms/Toast/ToastContext', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as object),
    useNavigate: () => navigateMock,
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('useTrackAndOpenApply', () => {
  beforeEach(() => {
    initiateMock.mockReset();
    openExternalApplyMock.mockReset();
    showToastMock.mockReset();
    navigateMock.mockReset();
    openExternalApplyMock.mockReturnValue(true);
  });

  it('initiates tracking and navigates to Auto Apply submissions without opening external URL by default', async () => {
    initiateMock.mockResolvedValue({
      application: { id: 'app-1' },
      possibleDuplicates: [],
    });

    const { result } = renderHook(() => useTrackAndOpenApply(), { wrapper });

    await result.current.trackAndOpenApply({
      jobId: '157482e4-c26a-427f-a55d-08b330526f39',
      applyUrl: 'https://jobs.example.com/apply',
    });

    await waitFor(() => {
      expect(initiateMock).toHaveBeenCalledWith('157482e4-c26a-427f-a55d-08b330526f39');
    });
    expect(openExternalApplyMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/auto-apply?tab=submissions');
    expect(showToastMock).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
  });

  it('opens the external apply URL when openExternal is true', async () => {
    initiateMock.mockResolvedValue({
      application: { id: 'app-1' },
      possibleDuplicates: [],
    });

    const { result } = renderHook(() => useTrackAndOpenApply(), { wrapper });

    await result.current.trackAndOpenApply({
      jobId: 'job-1',
      applyUrl: 'https://jobs.example.com/apply',
      openExternal: true,
    });

    expect(openExternalApplyMock).toHaveBeenCalledWith('https://jobs.example.com/apply');
  });

  it('treats APPLICATION_EXISTS as already tracked and still navigates', async () => {
    initiateMock.mockRejectedValue(
      new AutoApplyClientError('An auto-apply submission already exists for this job.', {
        code: 'APPLICATION_EXISTS',
        statusCode: 409,
      }),
    );

    const { result } = renderHook(() => useTrackAndOpenApply(), { wrapper });

    const outcome = await result.current.trackAndOpenApply({
      jobId: 'job-1',
      applyUrl: 'https://jobs.example.com/apply',
    });

    expect(outcome).toEqual({
      tracked: false,
      alreadyTracked: true,
      openedExternal: false,
    });
    expect(navigateMock).toHaveBeenCalledWith('/auto-apply?tab=submissions');
  });
});
