import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AnalysisStep } from '../AnalysisStep';

const mutate = vi.fn();

vi.mock('@/features/auto-apply/hooks/useJobPageAnalysis', () => ({
  useLatestJobAnalysis: vi.fn(),
  useAnalyzeJobPage: vi.fn(),
}));

import {
  useAnalyzeJobPage,
  useLatestJobAnalysis,
} from '@/features/auto-apply/hooks/useJobPageAnalysis';

const mockedLatest = vi.mocked(useLatestJobAnalysis);
const mockedAnalyze = vi.mocked(useAnalyzeJobPage);

const sampleAnalysis = {
  id: 'a1',
  jobId: 'job-1',
  provider: 'ASHBY',
  jobPageUrl: 'https://jobs.example.com',
  formStatus: 'NOT_INSPECTED',
  submissionCapability: 'EXTERNAL_MANUAL',
  outcomeStatus: 'READY',
  requirements: [
    {
      code: 'EXPERIENCE',
      assertion: 'REQUIRED',
      sourceText: '5+ years of experience with distributed systems',
    },
  ],
  analyzedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

/** Skipped: see docs/assisted-apply-skipped-tests.md (FE vitest hang) */
describe.skip('AnalysisStep', () => {
  beforeEach(() => {
    mutate.mockReset();
    mockedAnalyze.mockReturnValue({
      mutate,
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    } as never);
  });

  it('renders provider, requirements with quotes, and form-status notice', () => {
    mockedLatest.mockReturnValue({
      data: sampleAnalysis,
      isLoading: false,
      isFetching: false,
      isError: false,
    } as never);

    render(<AnalysisStep jobId="job-1" />);

    expect(screen.getByText('Ashby')).toBeInTheDocument();
    expect(
      screen.getByText(/We've reviewed the job posting, but haven't inspected the application form/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/According to the posting:.*"5\+ years of experience/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reanalyze' })).toBeInTheDocument();
  });

  it('does not re-trigger analyze when cached analysis exists', () => {
    mockedLatest.mockReturnValue({
      data: sampleAnalysis,
      isLoading: false,
      isFetching: false,
      isError: false,
    } as never);

    render(<AnalysisStep jobId="job-1" />);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('preserves previous analysis when reanalyze fails', async () => {
    const user = userEvent.setup();
    mockedLatest.mockReturnValue({
      data: sampleAnalysis,
      isLoading: false,
      isFetching: false,
      isError: false,
    } as never);
    mutate.mockImplementation((_vars, opts) => {
      opts?.onError?.(new Error('fail'));
    });

    render(<AnalysisStep jobId="job-1" />);
    await user.click(screen.getByRole('button', { name: 'Reanalyze' }));

    expect(
      screen.getByText('Reanalysis failed. Your previous analysis is still shown.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ashby')).toBeInTheDocument();
  });
});
