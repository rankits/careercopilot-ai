import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SetupStatusDto } from '../types/autoApply.types';
import { AutoApplyClientError } from '../utils/apiError';

import { useTrackAndOpenApply } from './useTrackAndOpenApply';

const {
  initiateMock,
  createPlanMock,
  prepareMock,
  openExternalApplyMock,
  showToastMock,
  navigateMock,
  setupStatusMock,
} = vi.hoisted(() => {
  const setupStatusMock: { data: SetupStatusDto } = {
    data: {
      readyForAssistedApply: true,
      gaps: [],
      complete: true,
      percent: 100,
      sections: [],
    },
  };

  return {
    initiateMock: vi.fn(),
    createPlanMock: vi.fn(),
    prepareMock: vi.fn(),
    openExternalApplyMock: vi.fn(),
    showToastMock: vi.fn(),
    navigateMock: vi.fn(),
    setupStatusMock,
  };
});

vi.mock('./useSubmissions', () => ({
  useInitiateSubmission: () => ({
    mutateAsync: initiateMock,
    isPending: false,
  }),
}));

vi.mock('./usePlan', () => ({
  useCreatePlan: () => ({
    mutateAsync: createPlanMock,
    isPending: false,
  }),
}));

vi.mock('./usePrepareApplication', () => ({
  usePrepareApplication: () => ({
    mutateAsync: prepareMock,
    isPending: false,
  }),
}));

vi.mock('./useSetupStatus', () => ({
  useSetupStatus: () => setupStatusMock,
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
    createPlanMock.mockReset();
    prepareMock.mockReset();
    openExternalApplyMock.mockReset();
    showToastMock.mockReset();
    navigateMock.mockReset();
    setupStatusMock.data = {
      readyForAssistedApply: true,
      gaps: [],
      complete: true,
      percent: 100,
      sections: [],
    };
    openExternalApplyMock.mockReturnValue(true);
    createPlanMock.mockResolvedValue({});
    prepareMock.mockResolvedValue({
      analysis: { id: 'a1', formStatus: 'NOT_INSPECTED', submissionCapability: 'EXTERNAL_MANUAL' },
      readiness: {
        decision: 'INFORMATION_REQUIRED',
        ready: false,
        blockingReasons: [],
        warnings: [],
      },
      match: { status: 'CACHED', overallScore: 0.9, displayScore: 90, jobId: 'job-1' },
      package: { submissionMode: 'EXTERNAL_MANUAL' },
      application: null,
    });
  });

  it('initiates tracking, runs prepare intelligence, auto-reviews, and navigates', async () => {
    initiateMock.mockResolvedValue({
      application: { id: 'app-1', jobId: '157482e4-c26a-427f-a55d-08b330526f39' },
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
    expect(prepareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: '157482e4-c26a-427f-a55d-08b330526f39',
        jobApplicationId: 'app-1',
        applyMode: 'ASSISTED',
      }),
    );
    expect(createPlanMock).toHaveBeenCalledWith('157482e4-c26a-427f-a55d-08b330526f39');
    expect(openExternalApplyMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/auto-apply?tab=submissions');
    expect(showToastMock).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
  });

  it('redirects incomplete setup to section deep links with Fix now toast (AA-029)', async () => {
    setupStatusMock.data = {
      readyForAssistedApply: false,
      gaps: [
        {
          code: 'APPROVED_RESUME',
          label: 'Approve at least one resume',
          section: 'resumes',
        },
      ],
      complete: false,
      percent: 50,
      sections: [],
    };

    const { result } = renderHook(() => useTrackAndOpenApply(), { wrapper });

    await result.current.trackAndOpenApply({ jobId: 'job-1' });

    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('approved resume'),
        actionLabel: 'Fix now',
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith('/auto-apply?section=resumes&field=defaultResume');
    expect(initiateMock).not.toHaveBeenCalled();
  });

  it('opens external URL only when openExternal is true', async () => {
    initiateMock.mockResolvedValue({
      application: { id: 'app-1', jobId: 'job-1' },
      possibleDuplicates: [],
    });

    const { result } = renderHook(() => useTrackAndOpenApply(), { wrapper });

    await result.current.trackAndOpenApply({
      jobId: 'job-1',
      applyUrl: 'https://jobs.example.com/apply',
      openExternal: true,
    });

    await waitFor(() => {
      expect(openExternalApplyMock).toHaveBeenCalledWith('https://jobs.example.com/apply');
    });
  });

  it('treats APPLICATION_EXISTS as already tracked', async () => {
    initiateMock.mockRejectedValue(
      new AutoApplyClientError('Already tracking', { code: 'APPLICATION_EXISTS' }),
    );

    const { result } = renderHook(() => useTrackAndOpenApply(), { wrapper });

    const outcome = await result.current.trackAndOpenApply({ jobId: 'job-1' });

    expect(outcome.alreadyTracked).toBe(true);
    expect(navigateMock).toHaveBeenCalledWith('/auto-apply?tab=submissions');
  });
});
