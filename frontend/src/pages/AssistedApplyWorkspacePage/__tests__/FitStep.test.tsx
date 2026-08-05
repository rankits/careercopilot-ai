import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { FitStep } from '../FitStep';

vi.mock('@/features/auto-apply/hooks/useApplicationReadiness', () => ({
  useApplicationReadiness: vi.fn(),
}));
vi.mock('@/features/auto-apply/hooks/useJobPageAnalysis', () => ({
  useLatestJobAnalysis: vi.fn(),
}));

import { useApplicationReadiness } from '@/features/auto-apply/hooks/useApplicationReadiness';
import { useLatestJobAnalysis } from '@/features/auto-apply/hooks/useJobPageAnalysis';

const mockedReadiness = vi.mocked(useApplicationReadiness);
const mockedAnalysis = vi.mocked(useLatestJobAnalysis);

function renderFit() {
  return render(
    <MemoryRouter>
      <FitStep jobApplicationId="app-1" jobId="job-1" onContinue={() => undefined} />
    </MemoryRouter>,
  );
}

/** Skipped: see docs/assisted-apply-skipped-tests.md (FE vitest hang) */
describe.skip('FitStep', () => {
  it('puts low match score in Worth reviewing and keeps Continue enabled', () => {
    mockedReadiness.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        decision: 'READY',
        ready: true,
        blockingReasons: [],
        warnings: [
          {
            code: 'MATCH_SCORE_BELOW_THRESHOLD',
            message: 'Match score is below your threshold.',
            severity: 'WARNING',
          },
        ],
      },
      refetch: vi.fn(),
    } as never);
    mockedAnalysis.mockReturnValue({
      data: { formStatus: 'NOT_INSPECTED' },
    } as never);

    renderFit();

    expect(screen.getByText('Worth reviewing')).toBeInTheDocument();
    expect(screen.getByText('Match score is below your threshold.')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('disables Continue when Blocks you is non-empty', () => {
    mockedReadiness.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        decision: 'JOB_UNAVAILABLE',
        ready: false,
        blockingReasons: [
          {
            code: 'JOB_NOT_ACTIVE',
            message: 'This job is no longer active.',
            severity: 'BLOCKING',
          },
        ],
        warnings: [],
      },
      refetch: vi.fn(),
    } as never);
    mockedAnalysis.mockReturnValue({ data: { formStatus: 'COMPLETE' } } as never);

    renderFit();

    expect(screen.getByText('Blocks you')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('shows all-clear when nothing to report', () => {
    mockedReadiness.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        decision: 'READY',
        ready: true,
        blockingReasons: [],
        warnings: [],
      },
      refetch: vi.fn(),
    } as never);
    mockedAnalysis.mockReturnValue({ data: { formStatus: 'COMPLETE' } } as never);

    renderFit();

    expect(screen.getByText('No fit concerns found.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });
});
