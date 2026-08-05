import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';
import {
  useCandidateProfile,
  useUpsertCandidateProfile,
} from '@/features/auto-apply/hooks/useCandidateProfile';

import { ProfessionalLinksSection } from '../ProfessionalLinksSection';
import { SetupDirtyProvider } from '../SetupDirtyContext';

vi.mock('@/features/auto-apply/hooks/useCandidateProfile');

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SetupDirtyProvider onRequestDiscardConfirm={vi.fn()}>
          <ProfessionalLinksSection />
        </SetupDirtyProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('ProfessionalLinksSection AA-024', () => {
  const mockUpsertProfile = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockUpsertProfile.mockResolvedValue({});

    vi.mocked(useCandidateProfile).mockReturnValue({
      data: {
        id: 'profile-1',
        userId: 'user-1',
        preferences: {
          desiredRoles: [],
          preferredLocations: [],
          remotePreferences: [],
        },
        links: {
          linkedin: 'https://linkedin.com/in/jane',
        },
        createdAt: '',
        updatedAt: '',
      },
      isLoading: false,
    } as any);

    vi.mocked(useUpsertCandidateProfile).mockReturnValue({
      mutateAsync: mockUpsertProfile,
      isPending: false,
    } as any);
  });

  it('does not require URLs when all link fields are empty', () => {
    vi.mocked(useCandidateProfile).mockReturnValue({
      data: {
        id: 'profile-1',
        userId: 'user-1',
        preferences: {
          desiredRoles: [],
          preferredLocations: [],
          remotePreferences: [],
        },
        links: {},
        createdAt: '',
        updatedAt: '',
      },
      isLoading: false,
    } as any);

    renderSection();

    expect(screen.getByLabelText(/LinkedIn profile/i)).toHaveValue('');
    expect(screen.getByLabelText(/GitHub profile/i)).toHaveValue('');
    expect(screen.getByLabelText(/Portfolio or personal site/i)).toHaveValue('');
  });

  it('shows inline URL validation errors', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.clear(screen.getByLabelText(/LinkedIn profile/i));
    await user.type(screen.getByLabelText(/LinkedIn profile/i), 'not-a-url');
    await user.click(screen.getByRole('button', { name: /^Save$/i }));

    expect(
      screen.getByText('Enter a valid URL starting with http:// or https://.'),
    ).toBeInTheDocument();
    expect(mockUpsertProfile).not.toHaveBeenCalled();
  });

  it('clears a saved link when emptied', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.clear(screen.getByLabelText(/LinkedIn profile/i));
    await user.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() =>
      expect(mockUpsertProfile).toHaveBeenCalledWith({
        links: {
          linkedin: undefined,
          github: undefined,
          portfolio: undefined,
        },
      }),
    );
  });
});
