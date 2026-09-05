import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAssistedApplyEvents } from '@/features/auto-apply/hooks/useAssistedApplyEvents';

import { ActivityTimelinePanel } from '../ActivityTimelinePanel';

vi.mock('@/features/auto-apply/hooks/useAssistedApplyEvents', () => ({
  useAssistedApplyEvents: vi.fn(),
}));

const mockedUseEvents = vi.mocked(useAssistedApplyEvents);

/** Skipped: see docs/assisted-apply-skipped-tests.md (FE vitest hang) */
describe.skip('ActivityTimelinePanel', () => {
  it('renders human-readable labels and never metadata', () => {
    mockedUseEvents.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: '1',
          eventType: 'ANALYSIS_COMPLETED',
          createdAt: new Date().toISOString(),
          metadata: { raw: 'secret' },
        },
      ],
    } as never);

    render(<ActivityTimelinePanel jobApplicationId="app-1" />);
    expect(screen.getByText(/Analyzed the job posting/i)).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });
});
