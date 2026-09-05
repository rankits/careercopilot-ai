import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAnalyzeJobPage,
  useLatestJobAnalysis,
} from '@/features/auto-apply/hooks/useJobPageAnalysis';

import { AnalysisStep } from '../AnalysisStep';

const mutate = vi.fn();

vi.mock('@/features/auto-apply/hooks/useJobPageAnalysis', () => ({
  useLatestJobAnalysis: vi.fn(),
  useAnalyzeJobPage: vi.fn(),
}));

vi.mock('@/features/auto-apply/hooks/useAssistedApplyEvents', () => ({
  useAssistedApplyEvents: vi.fn(() => ({
    data: [
      {
        id: 'e1',
        eventType: 'ANALYSIS_COMPLETED',
        createdAt: new Date().toISOString(),
        metadata: {},
      },
    ],
    isLoading: false,
    isError: false,
  })),
}));

vi.mock('@/shared/analytics/trackEvent', () => ({
  trackEvent: vi.fn(),
}));

const mockedLatest = vi.mocked(useLatestJobAnalysis);
const mockedAnalyze = vi.mocked(useAnalyzeJobPage);

const sampleAnalysis = {
  id: 'a1',
  jobId: 'job-1',
  provider: 'ASHBY',
  jobPageUrl: 'https://jobs.ashbyhq.com/linear/example',
  formStatus: 'NOT_INSPECTED',
  submissionCapability: 'EXTERNAL_MANUAL',
  outcomeStatus: 'JOB_PAGE_ANALYZED',
  status: 'COMPLETE' as const,
  extractorVersion: 'deterministic-v2',
  requirements: [
    {
      code: 'WORK_REGION',
      value: ['NORTH_AMERICA'],
      operator: 'IN' as const,
      required: true,
      confidence: 0.95,
      reviewStatus: 'REVIEW_REQUIRED',
      sourceText: 'open to candidates based in North America',
      extractionMethod: 'DOM_RULE',
      assertion: 'REQUIRES',
      importance: 'REQUIRED',
      evidenceStrength: 'EXPLICIT_TEXT',
      geographic: {
        rawValue: 'North America',
        normalizedRegion: 'NORTH_AMERICA',
        interpretationStatus: 'REVIEW_REQUIRED',
      },
    },
    {
      code: 'TOTAL_EXPERIENCE_YEARS',
      value: 5,
      operator: 'GTE' as const,
      required: true,
      confidence: 0.98,
      sourceText: '5+ years experience',
      reviewStatus: 'AUTO_ACCEPTED',
      assertion: 'REQUIRES',
      importance: 'REQUIRED',
      evidenceStrength: 'EXPLICIT_TEXT',
    },
    {
      code: 'MOBILE_DESIGN_EXPERIENCE',
      value: true,
      operator: 'REQUIRED' as const,
      required: true,
      confidence: 0.95,
      sourceText: 'Mobile Product Design',
      reviewStatus: 'AUTO_ACCEPTED',
      assertion: 'REQUIRES',
      importance: 'REQUIRED',
    },
  ],
  fields: [],
  snapshot: {
    contentHash: 'abcdef0123456789',
    fetchedAt: '2026-08-06T14:11:00.000Z',
    sanitizedTextLength: 1200,
    httpStatus: 200,
    finalUrl: 'https://jobs.ashbyhq.com/linear/example',
  },
  analyzedAt: '2026-08-06T14:11:00.000Z',
  expiresAt: '2026-08-13T14:11:00.000Z',
};

function renderAnalysis(props: Partial<Parameters<typeof AnalysisStep>[0]> = {}) {
  return render(
    <MemoryRouter>
      <AnalysisStep
        company="Linear"
        jobApplicationId="app-1"
        jobId="job-1"
        jobTitle="Mobile Product Designer"
        onContinue={vi.fn()}
        viewLabel="Tracking"
        workplaceMode="REMOTE"
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('AnalysisStep', () => {
  beforeEach(() => {
    mutate.mockReset();
    mockedAnalyze.mockReturnValue({
      mutate,
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    } as never);
    mockedLatest.mockReturnValue({
      data: sampleAnalysis,
      isLoading: false,
      isFetching: false,
      isError: false,
    } as never);
  });

  it('renders complete analysis with three structured requirement rows', () => {
    renderAnalysis();

    expect(screen.getByText('Requirements extracted from job posting')).toBeInTheDocument();
    expect(screen.getByText('3 Requirements Found')).toBeInTheDocument();
    expect(screen.getByText(/Work Region — requires/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Experience Years — requires/i)).toBeInTheDocument();
    expect(screen.getByText(/Mobile Design Experience — requires/i)).toBeInTheDocument();
    expect(screen.getByText('North America')).toBeInTheDocument();
    expect(screen.getByText('5+ years')).toBeInTheDocument();
    expect(screen.getAllByText('95%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('98%')).toBeInTheDocument();
    expect(screen.getAllByText('Review required').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('WORK_REGION')).not.toBeInTheDocument();
  });

  it('shows human-readable analysis metadata and summary averages', () => {
    renderAnalysis();

    expect(screen.getByText('Ashby')).toBeInTheDocument();
    expect(screen.getByText('Not inspected')).toBeInTheDocument();
    expect(screen.getByText('External manual')).toBeInTheDocument();
    expect(screen.getByText('Deterministic v2')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText('abcdef01')).toBeInTheDocument();
  });

  it('expands requirement details on demand', async () => {
    const user = userEvent.setup();
    renderAnalysis();

    const expandButtons = screen.getAllByRole('button', { name: /^Expand$/i });
    await user.click(expandButtons[0]!);

    expect(screen.getByText('Requirement code')).toBeInTheDocument();
    expect(screen.getByText('WORK_REGION')).toBeInTheDocument();
    expect(screen.getByText('DOM rule')).toBeInTheDocument();
  });

  it('navigates to Fit & Eligibility from what’s next CTA', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    renderAnalysis({ onContinue });

    await user.click(screen.getAllByRole('button', { name: /Go to Fit & Eligibility/i })[0]!);
    expect(onContinue).toHaveBeenCalled();
  });

  it('shows empty requirements state', () => {
    mockedLatest.mockReturnValue({
      data: { ...sampleAnalysis, requirements: [], status: 'LIMITED' },
      isLoading: false,
      isFetching: false,
      isError: false,
    } as never);

    renderAnalysis();
    expect(screen.getByText(/No structured requirements were found/i)).toBeInTheDocument();
    expect(screen.getByText('0 Requirements Found')).toBeInTheDocument();
  });

  it('does not re-trigger analyze when cached analysis exists', () => {
    renderAnalysis();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('preserves previous analysis when reanalyze fails', async () => {
    const user = userEvent.setup();
    mutate.mockImplementation((_vars, opts) => {
      opts?.onError?.(new Error('fail'));
    });

    renderAnalysis();
    await user.click(screen.getAllByRole('button', { name: /Reanalyze/i })[0]!);

    expect(
      screen.getByText(/Analysis failed; the previous result has been retained/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Work Region — requires/i)).toBeInTheDocument();
  });

  it('shows reanalyzing loading label while pending', () => {
    mockedAnalyze.mockReturnValue({
      mutate,
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    } as never);

    renderAnalysis();
    expect(screen.getAllByRole('button', { name: /Reanalyzing/i }).length).toBeGreaterThan(0);
  });
});
