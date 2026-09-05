import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import {
  useCandidateProfile,
  useUpsertCandidateProfile,
} from '@/features/auto-apply/hooks/useCandidateProfile';
import { useCurrentUser } from '@/features/user/hooks/useCurrentUser';
import { useUpdateUserProfile } from '@/features/user/hooks/useUpdateUserProfile';

import { PersonalContactSection } from '../PersonalContactSection';
import { SetupDirtyProvider } from '../SetupDirtyContext';

vi.mock('@/features/user/hooks/useCurrentUser');
vi.mock('@/features/user/hooks/useUpdateUserProfile');
vi.mock('@/features/auto-apply/hooks/useCandidateProfile');

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SetupDirtyProvider onRequestDiscardConfirm={vi.fn()}>
          <PersonalContactSection />
        </SetupDirtyProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('PersonalContactSection AA-021', () => {
  const mockUpdateUser = vi.fn();
  const mockUpsertProfile = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockUpdateUser.mockResolvedValue({});
    mockUpsertProfile.mockResolvedValue({});

    vi.mocked(useCurrentUser).mockReturnValue({
      data: {
        id: 'user-1',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+14155552671',
        role: 'USER',
      },
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
          currentLocation: 'Austin, TX',
          currentCountry: 'US',
        },
        links: {},
        createdAt: '',
        updatedAt: '',
      },
      isLoading: false,
    } as any);

    vi.mocked(useUpdateUserProfile).mockReturnValue({
      mutateAsync: mockUpdateUser,
      isPending: false,
    } as any);

    vi.mocked(useUpsertCandidateProfile).mockReturnValue({
      mutateAsync: mockUpsertProfile,
      isPending: false,
    } as any);
  });

  it('pre-populates saved values and keeps email read-only', () => {
    renderSection();

    expect(screen.getByLabelText(/Full name/i)).toHaveValue('Jane Doe');
    expect(screen.getByLabelText(/Email/i)).toHaveValue('jane@example.com');
    expect(screen.getByLabelText(/Email/i)).toBeDisabled();
    expect(screen.getByLabelText(/Current city or region/i)).toHaveValue('Austin, TX');
  });

  it('shows validation errors without calling APIs', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.clear(screen.getByLabelText(/Full name/i));
    await user.click(screen.getByRole('button', { name: /^Save changes$/i }));

    expect(screen.getByText('Enter your full name.')).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockUpsertProfile).not.toHaveBeenCalled();
  });

  it('requires both first and last name before calling the API', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.clear(screen.getByLabelText(/Full name/i));
    await user.type(screen.getByLabelText(/Full name/i), 'Madonna');
    await user.click(screen.getByRole('button', { name: /^Save changes$/i }));

    expect(screen.getByText('Please enter both your first and last name.')).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockUpsertProfile).not.toHaveBeenCalled();
  });

  it('saves user and profile data on happy path', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.clear(screen.getByLabelText(/Full name/i));
    await user.type(screen.getByLabelText(/Full name/i), 'Janet Doe');
    await user.click(screen.getByRole('button', { name: /^Save changes$/i }));

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalled());
    expect(mockUpdateUser).toHaveBeenCalledWith({
      firstName: 'Janet',
      lastName: 'Doe',
      phone: '+14155552671',
    });
  });

  it('allows saving with an empty phone number', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.clear(screen.getByLabelText(/Phone number/i));
    await user.click(screen.getByRole('button', { name: /^Save changes$/i }));

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalled());
    expect(mockUpdateUser).toHaveBeenCalledWith({
      firstName: 'Jane',
      lastName: 'Doe',
      phone: null,
    });
  });

  it('accepts phone numbers without a plus prefix', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.clear(screen.getByLabelText(/Phone number/i));
    await user.type(screen.getByLabelText(/Phone number/i), '9876543210');
    await user.click(screen.getByRole('button', { name: /^Save changes$/i }));

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalled());
    expect(mockUpdateUser).toHaveBeenCalledWith({
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '9876543210',
    });
  });

  it('shows partial-failure toast when profile save fails after user save', async () => {
    const user = userEvent.setup();
    mockUpsertProfile.mockRejectedValueOnce(new Error('profile failed'));
    renderSection();

    await user.clear(screen.getByLabelText(/Current city or region/i));
    await user.type(screen.getByLabelText(/Current city or region/i), 'Denver, CO');
    await user.click(screen.getByRole('button', { name: /^Save changes$/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Your name and phone were saved, but we couldn't save your location. Try again.",
        ),
      ).toBeInTheDocument(),
    );
  });
});
