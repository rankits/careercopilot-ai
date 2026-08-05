import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';
import { useApplicationRule, useUpsertApplicationRule } from '@/features/auto-apply/hooks/useApplicationRule';

import { RulesTab } from '../RulesTab';

vi.mock('@/features/auto-apply/hooks/useApplicationRule', () => ({
  useApplicationRule: vi.fn(),
  useUpsertApplicationRule: vi.fn(),
  useToggleAutopilotPause: vi.fn(),
}));

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RulesTab />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('ExclusionsSection AA-027', () => {
  const mockUpsert = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockUpsert.mockResolvedValue({});

    vi.mocked(useApplicationRule).mockReturnValue({
      data: {
        id: 'rule-1',
        minMatchScore: 0.85,
        dailyApplicationLimit: 5,
        weeklyApplicationLimit: null,
        blacklistedCompanySlugs: [],
        excludedTitleKeywords: [],
        excludedSources: [],
        autopilotEnabled: false,
        autopilotPausedAt: null,
      },
      isLoading: false,
    } as any);

    vi.mocked(useUpsertApplicationRule).mockReturnValue({
      mutateAsync: mockUpsert,
      isPending: false,
    } as any);
  });

  it('renders Exclusions heading and chip editors without autopilot controls', () => {
    renderTab();

    expect(screen.getByRole('heading', { name: /^Exclusions$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Companies to exclude/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Title keywords to exclude/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sources to exclude/i)).toBeInTheDocument();
    expect(screen.getAllByText('No exclusions yet.')).toHaveLength(3);

    expect(screen.queryByText(/autopilot/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/daily application limit/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pause autopilot/i })).not.toBeInTheDocument();
  });

  it('rejects duplicate company exclusions inline', async () => {
    const user = userEvent.setup();
    vi.mocked(useApplicationRule).mockReturnValue({
      data: {
        id: 'rule-1',
        minMatchScore: 0.85,
        dailyApplicationLimit: 5,
        weeklyApplicationLimit: null,
        blacklistedCompanySlugs: ['Acme Corp'],
        excludedTitleKeywords: [],
        excludedSources: [],
        autopilotEnabled: false,
        autopilotPausedAt: null,
      },
      isLoading: false,
    } as any);

    renderTab();

    const input = screen.getByLabelText(/Companies to exclude/i);
    await user.type(input, 'Acme Corp{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent('Already excluded.');
  });
});
