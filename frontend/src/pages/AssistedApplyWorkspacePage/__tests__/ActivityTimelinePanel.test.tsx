import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActivityTimelinePanel } from '../ActivityTimelinePanel';

vi.mock('@/features/auto-apply/hooks/useAssistedApplyEvents', () => ({
  useAssistedApplyEvents: vi.fn(),
}));

import { useAssistedApplyEvents } from '@/features/auto-apply/hooks/useAssistedApplyEvents';

const mockedUseEvents = vi.mocked(useAssistedApplyEvents);

/** Skipped: see docs/assisted-apply-skipped-tests.md (FE vitest hang) */
describe.skip('ActivityTimelinePanel', () => {
  it('renders human-readable labels and never metadata', () => {
    mockedUseEvents.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'e1',
          userId: 'u1',
          jobApplicationId: 'app-1',
          eventType: 'SUBMISSION_INITIATED',
          metadata: { secretResume: 'SHOULD_NOT_RENDER' },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'e2',
          userId: 'u1',
          jobApplicationId: 'app-1',
          eventType: 'UNKNOWN_FUTURE_TYPE',
          metadata: {},
          createdAt: new Date().toISOString(),
        },
      ],
    } as never);

    render(<ActivityTimelinePanel jobApplicationId="app-1" />);

    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Started tracking this application')).toBeInTheDocument();
    expect(screen.getByText('Activity recorded')).toBeInTheDocument();
    expect(screen.queryByText('SUBMISSION_INITIATED')).not.toBeInTheDocument();
    expect(screen.queryByText('UNKNOWN_FUTURE_TYPE')).not.toBeInTheDocument();
    expect(screen.queryByText(/SHOULD_NOT_RENDER/)).not.toBeInTheDocument();
  });

  it('shows empty state', () => {
    mockedUseEvents.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [],
    } as never);

    render(<ActivityTimelinePanel jobApplicationId="app-1" />);
    expect(screen.getByText('No activity yet.')).toBeInTheDocument();
  });
});
