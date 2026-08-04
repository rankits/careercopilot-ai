import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { EditProfilePage } from './EditProfilePage';

const { getMyProfileMock, updateProfileMock } = vi.hoisted(() => ({
  getMyProfileMock: vi.fn(),
  updateProfileMock: vi.fn(),
}));

vi.mock('@/features/resume/services/resume.service', () => ({
  resumeService: {
    getMyProfile: getMyProfileMock,
    updateProfile: updateProfileMock,
  },
}));

const existingProfile = {
  certifications: [],
  education: [],
  experience: [],
  isComplete: true,
  personalDetails: {
    designation: 'Engineer',
    email: 'ada@example.com',
    fullName: 'Ada Lovelace',
    phone: '+14155552671',
    summary: 'Computing pioneer',
    totalExperience: '8',
  },
  skills: ['Algorithms'],
  sourceResumeId: 'resume-1',
  userId: 'user-1',
};

function LocationDisplay() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <EditProfilePage />
          <LocationDisplay />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('EditProfilePage', () => {
  beforeEach(() => {
    getMyProfileMock.mockReset();
    updateProfileMock.mockReset();
  });

  it('has no resume upload affordance - it only edits the existing profile', async () => {
    getMyProfileMock.mockResolvedValueOnce(existingProfile);
    renderPage();

    await screen.findByRole('textbox', { name: /full name/i });

    expect(screen.queryByLabelText(/choose resume/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /parse resume/i })).not.toBeInTheDocument();
  });

  it('loads and pre-fills the form with the existing (latest) profile', async () => {
    getMyProfileMock.mockResolvedValueOnce(existingProfile);
    renderPage();

    expect(await screen.findByRole('textbox', { name: /full name/i })).toHaveValue('Ada Lovelace');
    expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('ada@example.com');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled();
  });

  it('submits changes through the update API, shows a success message, and stays on the page', async () => {
    const user = userEvent.setup();
    getMyProfileMock.mockResolvedValueOnce(existingProfile);
    updateProfileMock.mockResolvedValueOnce({
      message: 'Candidate profile updated',
      profile: existingProfile,
    });
    renderPage();

    await screen.findByRole('textbox', { name: /full name/i });
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(screen.getByRole('dialog', { name: /confirm profile changes/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirm & save/i }));

    await waitFor(() => expect(updateProfileMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/candidate profile updated/i)).toBeInTheDocument();
  });

  it('shows an error toast when the update API call fails', async () => {
    const user = userEvent.setup();
    getMyProfileMock.mockResolvedValueOnce(existingProfile);
    updateProfileMock.mockRejectedValueOnce(new Error('Unable to reach the resume service.'));
    renderPage();

    await screen.findByRole('textbox', { name: /full name/i });
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await user.click(screen.getByRole('button', { name: /confirm & save/i }));

    expect(await screen.findByText(/unable to reach the resume service/i)).toBeInTheDocument();
  });

  it('cancels the confirmation dialog without submitting', async () => {
    const user = userEvent.setup();
    getMyProfileMock.mockResolvedValueOnce(existingProfile);
    renderPage();

    await screen.findByRole('textbox', { name: /full name/i });
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it('navigates to the resume upload page when "Upload a new resume" is clicked', async () => {
    const user = userEvent.setup();
    getMyProfileMock.mockResolvedValueOnce(existingProfile);
    renderPage();

    await screen.findByRole('textbox', { name: /full name/i });
    await user.click(screen.getByRole('button', { name: /upload a new resume/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/profile');
  });

  it('surfaces a clear message and disables saving when no profile exists yet', async () => {
    getMyProfileMock.mockResolvedValueOnce(null);
    renderPage();

    expect(
      await screen.findByText(/complete onboarding before editing your profile/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  it('shows an error notice when loading the profile fails', async () => {
    getMyProfileMock.mockRejectedValueOnce(new Error('Network down'));
    renderPage();

    expect(await screen.findByText(/network down/i)).toBeInTheDocument();
  });
});
