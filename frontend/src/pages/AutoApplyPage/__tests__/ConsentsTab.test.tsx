import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import {
  useConsents,
  useGrantConsent,
  useRevokeConsent,
} from '@/features/auto-apply/hooks/useConsents';

import { ConsentsTab } from '../ConsentsTab';

vi.mock('@/features/auto-apply/hooks/useConsents', () => ({
  useConsents: vi.fn(),
  useGrantConsent: vi.fn(),
  useRevokeConsent: vi.fn(),
}));

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConsentsTab />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('ConsentsTab AA-002', () => {
  const mockGrant = vi.fn();
  const mockRevoke = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockGrant.mockResolvedValue(undefined);
    mockRevoke.mockResolvedValue(undefined);

    vi.mocked(useConsents).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    vi.mocked(useGrantConsent).mockReturnValue({
      mutateAsync: mockGrant,
      isPending: false,
    } as any);

    vi.mocked(useRevokeConsent).mockReturnValue({
      mutateAsync: mockRevoke,
      isPending: false,
    } as any);
  });

  it('renders only RESUME_USAGE and CONTENT_GENERATION consent rows', () => {
    renderTab();

    expect(screen.getByText('Use my resume on applications')).toBeInTheDocument();
    expect(screen.getByText('Draft cover letters and answers for me')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Turn on$/i })).toHaveLength(2);

    expect(
      screen.queryByText(/Send applications from my connected email/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Apply automatically under my rules/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Not available yet/i)).not.toBeInTheDocument();
  });

  it('grants RESUME_USAGE when Turn on is clicked', async () => {
    const user = userEvent.setup();
    renderTab();

    const turnOnButtons = screen.getAllByRole('button', { name: /^Turn on$/i });
    await user.click(turnOnButtons[0]!);

    expect(mockGrant).toHaveBeenCalledWith('RESUME_USAGE');
  });

  it('grants CONTENT_GENERATION from the second Turn on control', async () => {
    const user = userEvent.setup();
    renderTab();

    const turnOnButtons = screen.getAllByRole('button', { name: /^Turn on$/i });
    expect(turnOnButtons).toHaveLength(2);
    await user.click(turnOnButtons[1]!);

    expect(mockGrant).toHaveBeenCalledWith('CONTENT_GENERATION');
  });

  it('revokes an active RESUME_USAGE consent', async () => {
    const user = userEvent.setup();
    vi.mocked(useConsents).mockReturnValue({
      data: [
        {
          id: 'consent-resume',
          consentType: 'RESUME_USAGE',
          revokedAt: null,
        },
      ],
      isLoading: false,
    } as any);

    renderTab();

    await user.click(screen.getByRole('button', { name: /^Turn off$/i }));
    expect(mockRevoke).toHaveBeenCalledWith('consent-resume');
  });
});
