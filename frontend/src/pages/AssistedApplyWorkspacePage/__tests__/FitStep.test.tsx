import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auto-apply/hooks/useApplicationReadiness', () => ({
  useApplicationReadiness: vi.fn(),
}));
vi.mock('@/features/auto-apply/hooks/useJobPageAnalysis', () => ({
  useLatestJobAnalysis: vi.fn(),
}));
vi.mock('@/features/auto-apply/hooks/usePrepareApplication', () => ({
  usePrepareApplication: vi.fn(() => ({
    isPending: false,
    mutate: vi.fn(),
  })),
}));
vi.mock('@/shared/analytics/trackEvent', () => ({
  trackEvent: vi.fn(),
}));

import { useApplicationReadiness } from '@/features/auto-apply/hooks/useApplicationReadiness';
import { useLatestJobAnalysis } from '@/features/auto-apply/hooks/useJobPageAnalysis';

import type { ProfileJobMatchDto } from '@/features/auto-apply/types/autoApply.types';

import { FitStep } from '../FitStep';

const mockedReadiness = vi.mocked(useApplicationReadiness);
const mockedAnalysis = vi.mocked(useLatestJobAnalysis);

function goodMatch(): ProfileJobMatchDto {
  return {
    overallAlignment: 0.78,
    eligibility: { status: 'ELIGIBLE', blockers: [] },
    roleMatch: {
      status: 'MATCH',
      evidence: [{ code: 'ROLE_OK', message: 'Strong role alignment' }],
      jobTitle: 'Backend Product Manager',
      desiredRoles: ['Product Manager'],
    },
    skillsMatch: { matched: [], missing: [], unknown: ['Go'] },
    experienceMatch: {
      requiredYears: 5,
      candidateYears: 6,
      status: 'MATCH',
      evidence: [{ code: 'EXP_OK', message: 'Experience met' }],
    },
    locationMatch: {
      status: 'MATCH',
      evidence: [{ code: 'LOC_OK', message: 'Location compatible' }],
      candidateRegion: 'US-CA',
    },
    workAuthorizationMatch: {
      status: 'MATCH',
      evidence: [{ code: 'AUTH_OK', message: 'Authorized' }],
      candidateAnswer: 'AUTHORIZED',
    },
    sponsorshipMatch: {
      status: 'NOT_APPLICABLE',
      evidence: [{ code: 'SPONSOR_NA', message: 'Not required' }],
      candidateRequiresSponsorship: false,
      jobProvidesSponsorship: false,
    },
    confidence: 'HIGH',
    warnings: [],
    missingInformation: [],
    recommendationScoreFallback: 0.55,
    analysisId: 'analysis-1',
    jobId: 'job-1',
    matchedAt: '2026-08-06T12:00:00.000Z',
    schemaVersion: 1,
  };
}

function renderFit(
  props: Partial<ComponentProps<typeof FitStep>> = {},
  options?: {
    readiness?: {
      ready: boolean;
      decision?: string;
      blockingReasons?: Array<{ code: string; message: string; severity?: string }>;
      warnings?: Array<{ code: string; message: string; severity?: string }>;
    };
  },
) {
  const readiness = options?.readiness ?? {
    decision: 'READY',
    ready: true,
    blockingReasons: [],
    warnings: [],
  };
  mockedReadiness.mockReturnValue({
    isLoading: false,
    isError: false,
    data: {
      decision: readiness.decision ?? (readiness.ready ? 'READY' : 'BLOCKED'),
      ready: readiness.ready,
      blockingReasons: (readiness.blockingReasons ?? []).map((r) => ({
        severity: 'BLOCKING',
        ...r,
      })),
      warnings: (readiness.warnings ?? []).map((r) => ({
        severity: 'WARNING',
        ...r,
      })),
    },
    refetch: vi.fn(),
  } as never);
  mockedAnalysis.mockReturnValue({
    data: {
      status: 'COMPLETE',
      formStatus: 'NOT_INSPECTED',
      requirements: [
        {
          code: 'WORK_REGION',
          assertion: 'REQUIRES',
          importance: 'REQUIRED',
          required: true,
          value: 'North America',
          confidence: 0.9,
          sourceText: 'Must be based in North America',
        },
      ],
    },
    isLoading: false,
    isError: false,
  } as never);

  const onContinue = props.onContinue ?? vi.fn();
  const onBack = props.onBack ?? vi.fn();

  return {
    onContinue,
    onBack,
    ...render(
      <MemoryRouter>
        <FitStep
          company="Acme Inc."
          jobApplicationId="app-1"
          jobId="job-1"
          jobTitle="Backend Product Manager"
          onBack={onBack}
          onContinue={onContinue}
          profileMatch={goodMatch()}
          viewLabel="Tracking"
          {...props}
        />
      </MemoryRouter>,
    ),
  };
}

describe('FitStep', () => {
  it('renders profile match as the primary score and recommendation as context', () => {
    renderFit();
    expect(screen.getByText(/meets the confirmed eligibility requirements/i)).toBeInTheDocument();
    expect(screen.getAllByText('78%').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Previous recommendation score \(context only\):/i),
    ).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
    expect(screen.getAllByText(/Profile Alignment/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Top Strengths/i)).toBeInTheDocument();
    expect(screen.queryByText('Worth reviewing')).not.toBeInTheDocument();
  });

  it('keeps alignment and eligibility separate for not-eligible matches', () => {
    const match = goodMatch();
    match.overallAlignment = 0.65;
    match.eligibility = {
      status: 'NOT_ELIGIBLE',
      blockers: [
        {
          code: 'JOB_LOCATION_REQUIREMENT_NOT_MET',
          message: 'Job requires North America; candidate is outside this region.',
        },
      ],
    };

    renderFit(
      { profileMatch: match },
      {
        readiness: {
          ready: false,
          blockingReasons: [{ code: 'LOCATION', message: 'Location incompatible' }],
        },
      },
    );
    expect(screen.getByText(/Not eligible due to a hard blocker/i)).toBeInTheDocument();
    expect(screen.getAllByText('65%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Employer handoff is currently blocked/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Next: Resume' })[0]).not.toBeDisabled();
  });

  it('does not show fake dimension percentages for unknown skills', async () => {
    const user = userEvent.setup();
    renderFit();
    expect(screen.getAllByText('Not confirmed').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('40%')).not.toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Skills' }));
    expect(screen.getAllByText(/Unconfirmed skills/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Go')).toBeInTheDocument();
    expect(screen.getAllByText(/Checked in Resume step/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Missing skill: Go/i)).not.toBeInTheDocument();
  });

  it('shows hard blockers and information required distinctly', () => {
    const match = goodMatch();
    match.eligibility = {
      status: 'NOT_ELIGIBLE',
      blockers: [
        {
          code: 'JOB_LOCATION_REQUIREMENT_NOT_MET',
          message: 'Location incompatibility.',
        },
      ],
    };
    match.missingInformation = [
      {
        code: 'WORK_AUTHORIZATION_MISSING',
        message: 'Work authorization not verified.',
        field: 'workAuthorization',
      },
    ];
    renderFit({ profileMatch: match });
    expect(screen.getAllByText(/Hard blocker/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Information required/i).length).toBeGreaterThanOrEqual(1);
  });

  it('keeps What’s Missing non-empty', async () => {
    const user = userEvent.setup();
    renderFit();
    await user.click(screen.getByRole('tab', { name: /What’s Missing|What's Missing/i }));
    expect(
      screen.getAllByText(/No unresolved issues|Hard blockers|Information required|Advisory gaps/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders extracted requirements on the Requirements tab', async () => {
    const user = userEvent.setup();
    renderFit();
    await user.click(screen.getByRole('tab', { name: 'Requirements' }));
    expect(screen.getAllByText(/North America/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Must be based in North America/i)).toBeInTheDocument();
  });

  it('shows missing profileMatch retry state', () => {
    renderFit({ profileMatch: null });
    expect(screen.getByText(/Fit analysis is not ready/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry preparation' })).toBeInTheDocument();
  });

  it('navigates back and forward while resume stays enabled', async () => {
    const user = userEvent.setup();
    const { onBack, onContinue } = renderFit();
    await user.click(screen.getAllByRole('button', { name: 'Back to Analysis' })[0]!);
    expect(onBack).toHaveBeenCalled();
    await user.click(screen.getAllByRole('button', { name: 'Next: Resume' })[0]!);
    expect(onContinue).toHaveBeenCalled();
  });

  it('removes active next actions for completed applications', () => {
    renderFit({ applicationStatus: 'SUBMITTED', viewState: 'APPLIED' });
    expect(screen.getByText(/Application submitted manually/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next: Resume' })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: /View application details/i }).length,
    ).toBeGreaterThan(0);
  });
});
