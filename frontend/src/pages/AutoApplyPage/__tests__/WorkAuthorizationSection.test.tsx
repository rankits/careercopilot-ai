import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';
import {
  useApplicationAnswers,
  useUpsertApplicationAnswer,
} from '@/features/auto-apply/hooks/useApplicationAnswers';
import {
  useCandidateProfile,
  useUpsertCandidateProfile,
} from '@/features/auto-apply/hooks/useCandidateProfile';

import { WorkAuthorizationSection } from '../WorkAuthorizationSection';
import { SetupDirtyProvider } from '../SetupDirtyContext';

vi.mock('@/features/auto-apply/hooks/useApplicationAnswers');
vi.mock('@/features/auto-apply/hooks/useCandidateProfile');

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SetupDirtyProvider onRequestDiscardConfirm={vi.fn()}>
          <WorkAuthorizationSection />
        </SetupDirtyProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('WorkAuthorizationSection AA-022', () => {
  const mockUpsertAnswer = vi.fn();
  const mockUpsertProfile = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockUpsertAnswer.mockResolvedValue({});
    mockUpsertProfile.mockResolvedValue({});

    vi.mocked(useApplicationAnswers).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    vi.mocked(useCandidateProfile).mockReturnValue({
      data: {
        id: 'profile-1',
        userId: 'user-1',
        preferences: {
          desiredRoles: [],
          preferredLocations: [],
          remotePreferences: [],
          currentCountry: 'US',
        },
        links: {},
        createdAt: '',
        updatedAt: '',
      },
      isLoading: false,
    } as any);

    vi.mocked(useUpsertApplicationAnswer).mockReturnValue({
      mutateAsync: mockUpsertAnswer,
      isPending: false,
    } as any);

    vi.mocked(useUpsertCandidateProfile).mockReturnValue({
      mutateAsync: mockUpsertProfile,
      isPending: false,
    } as any);
  });

  it('requires a work authorization choice before saving', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByLabelText(/Yes, I'll need sponsorship/i));
    await user.click(screen.getByRole('button', { name: /^Save$/i }));

    expect(screen.getByText('Choose one of the options above.')).toBeInTheDocument();
    expect(mockUpsertAnswer).not.toHaveBeenCalled();
  });

  it('preserves unknown sponsorship when only work authorization is saved', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(
      screen.getByLabelText(/Authorized to work in United States without sponsorship/i),
    );
    await user.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => expect(mockUpsertAnswer).toHaveBeenCalled());
    expect(mockUpsertProfile).not.toHaveBeenCalled();
  });

  it('persists explicit sponsorship choices', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(
      screen.getByLabelText(/Authorized to work in United States without sponsorship/i),
    );
    await user.click(screen.getByLabelText(/No, I don't need sponsorship/i));
    await user.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() =>
      expect(mockUpsertProfile).toHaveBeenCalledWith({
        preferences: { requiresSponsorship: false },
      }),
    );
  });
});
