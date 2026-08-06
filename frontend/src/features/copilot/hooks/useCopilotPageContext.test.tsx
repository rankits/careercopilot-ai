import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jobDetailQueryKey } from '@/features/jobs/hooks/useJobDetail';
import { useJobDetail } from '@/features/jobs/hooks/useJobDetail';

import { useCopilotPageContext } from './useCopilotPageContext';

const { getJobMock } = vi.hoisted(() => ({
  getJobMock: vi.fn(),
}));

vi.mock('@/features/jobs/services/jobs.service', () => ({
  jobsService: {
    getJob: getJobMock,
  },
}));

vi.mock('@/features/resume/services/resume.service', () => ({
  resumeService: {
    getMyProfile: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/features/applications/services/applications.service', () => ({
  applicationsService: {
    list: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

vi.mock('@/hooks/redux', () => ({
  useAppSelector: () => null,
}));

const jobDetail = {
  id: '8c2e8bcf-7b19-4ec6-b1c0-0c82cd5b270f',
  title: 'Engineer',
  company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
  location: { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: 'FULL_TIME',
  salary: { minimum: null, maximum: null, currency: null },
  skills: [],
  publishedAt: null,
  applyUrl: null,
  descriptionHtml: '',
  descriptionText: '',
  benefits: [],
  tags: [],
  companyIndustry: null,
  companySize: null,
};

function renderBothHooks(jobId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/jobs/${jobId}`]}>
        <Routes>
          <Route path="/jobs/:jobId" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

  const detail = renderHook(() => useJobDetail(jobId), { wrapper });
  const copilot = renderHook(() => useCopilotPageContext(), { wrapper });

  return { detail, copilot, queryClient };
}

describe('useCopilotPageContext', () => {
  beforeEach(() => {
    getJobMock.mockReset();
    getJobMock.mockResolvedValue(jobDetail);
  });

  it('shares the job detail query cache with useJobDetail', async () => {
    const jobId = jobDetail.id;
    const { detail, copilot, queryClient } = renderBothHooks(jobId);

    await waitFor(() => {
      expect(detail.result.current.isSuccess).toBe(true);
      expect(copilot.result.current.context.job?.title).toBe('Engineer');
    });

    expect(getJobMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(jobDetailQueryKey(jobId))).toEqual(jobDetail);
  });
});
