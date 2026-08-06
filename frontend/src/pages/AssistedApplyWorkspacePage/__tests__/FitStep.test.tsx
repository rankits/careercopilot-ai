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

function renderFit(props: Partial<ComponentProps<typeof FitStep>> = {}) {
  mockedReadiness.mockReturnValue({
    isLoading: false,
    isError: false,
    data: { decision: 'READY', ready: true, blockingReasons: [], warnings: [] },
    refetch: vi.fn(),
  } as never);
  mockedAnalysis.mockReturnValue({
    data: { status: 'COMPLETE', formStatus: 'NOT_INSPECTED' },
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
    expect(screen.getByText('Your profile is a good match for this role')).toBeInTheDocument();
    expect(screen.getAllByText('78%').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Previous recommendation score \(context only\):/i),
    ).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
    expect(screen.getByText(/Overall Profile Match/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Strengths/i)).toBeInTheDocument();
    expect(screen.getByText(/Key Gaps/i)).toBeInTheDocument();
    expect(screen.queryByText('Worth reviewing')).not.toBeInTheDocument();
  });

  it('shows missing profileMatch fallback', () => {
    renderFit({ profileMatch: null });
    expect(screen.getByText(/still preparing your fit analysis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('navigates back and forward', async () => {
    const user = userEvent.setup();
    const { onBack, onContinue } = renderFit();
    await user.click(screen.getAllByRole('button', { name: 'Back to Analysis' })[0]!);
    expect(onBack).toHaveBeenCalled();
    await user.click(screen.getAllByRole('button', { name: 'Next: Resume' })[0]!);
    expect(onContinue).toHaveBeenCalled();
  });

  it('renders not-eligible banner treatment', () => {
    const match = goodMatch();
    match.eligibility = {
      status: 'NOT_ELIGIBLE',
      blockers: [{ code: 'AUTH', message: 'Not authorized for this region.' }],
    };
    match.overallAlignment = 0.2;
    renderFit({ profileMatch: match });
    expect(
      screen.getByText(/does not currently meet one or more required conditions/i),
    ).toBeInTheDocument();
  });
});
