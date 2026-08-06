import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { authReducer } from '@/features/auth/authSlice';

import { EditProfilePage } from './EditProfilePage';

const {
  confirmProfileMock,
  downloadResumeMock,
  getMyProfileMock,
  listResumesMock,
  parseMock,
  updateProfileMock,
} = vi.hoisted(() => ({
  confirmProfileMock: vi.fn(),
  downloadResumeMock: vi.fn(),
  getMyProfileMock: vi.fn(),
  listResumesMock: vi.fn(),
  parseMock: vi.fn(),
  updateProfileMock: vi.fn(),
}));

vi.mock('@/features/resume/services/resume.service', () => ({
  resumeService: {
    confirmProfile: confirmProfileMock,
    downloadResume: downloadResumeMock,
    getMyProfile: getMyProfileMock,
    listResumes: listResumesMock,
    parse: parseMock,
    updateProfile: updateProfileMock,
  },
}));

vi.mock('@/features/resume/hooks/useResumeParser', () => ({
  useResumeParser: (onParsed: (values: Record<string, string>) => void) => {
    const state = { resumeId: null as string | null };
    return {
      error: null,
      isPending: false,
      metadata: null,
      parse: async (...args: unknown[]) => {
        await parseMock(...args);
        state.resumeId = 'resume-2';
        onParsed({
          certifications: '',
          currentCompany: 'Analytical Engines',
          designation: 'Engineer',
          education: '',
          email: 'ada@example.com',
          fullName: 'Ada Lovelace',
          location: 'London',
          phone: '+14155552671',
          projects: '',
          skills: 'Algorithms',
          summary: 'Parsed summary from resume',
          totalExperience: '8',
          workExperience: 'Engineer — Analytical Engines',
        });
      },
      parseProgress: null,
      reset: vi.fn(() => {
        state.resumeId = null;
      }),
      get resumeId() {
        return state.resumeId;
      },
    };
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
  const store = configureStore({
    preloadedState: {
      auth: {
        accessToken: 'token',
        error: null,
        isAuthenticated: true,
        isLoading: false,
        isProfileComplete: true,
        isSessionResolved: true,
        user: {
          email: 'ada@example.com',
          id: 'user-1',
          name: 'Ada Lovelace',
          role: 'user' as const,
        },
      },
    },
    reducer: { auth: authReducer },
  });
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/profile/edit']}>
            <EditProfilePage />
            <LocationDisplay />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </Provider>,
  );
}

describe('EditProfilePage', () => {
  beforeEach(() => {
    getMyProfileMock.mockReset();
    updateProfileMock.mockReset();
    confirmProfileMock.mockReset();
    listResumesMock.mockReset();
    downloadResumeMock.mockReset();
    parseMock.mockReset();
    listResumesMock.mockResolvedValue([
      {
        id: 'resume-1',
        mimeType: 'application/pdf',
        originalName: 'ada.pdf',
        processedAt: null,
        sizeBytes: 2048,
        status: 'PROCESSED',
        uploadedAt: '2026-08-01T10:00:00.000Z',
        version: 1,
      },
    ]);
  });

  it('keeps upload on the edit page and opens resume versions in a dialog', async () => {
    const user = userEvent.setup();
    getMyProfileMock.mockResolvedValueOnce(existingProfile);
    renderPage();

    await screen.findByRole('textbox', { name: /full name/i });

    expect(screen.getByTestId('location')).toHaveTextContent('/profile/edit');
    expect(screen.getByLabelText(/choose resume/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /parse resume/i })).toBeInTheDocument();
    expect(screen.queryByText(/version 1 · ada\.pdf/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view resume versions \(1\)/i }));

    expect(
      await screen.findByRole('dialog', { name: /uploaded resume versions/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/version 1/i)).toBeInTheDocument();
    expect(screen.getByText(/ada\.pdf/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('loads and pre-fills the form with the existing (latest) profile', async () => {
    getMyProfileMock.mockResolvedValueOnce(existingProfile);
    renderPage();

    expect(await screen.findByRole('textbox', { name: /full name/i })).toHaveValue('Ada Lovelace');
    expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('ada@example.com');
    expect(screen.getByRole('textbox', { name: /phone number/i })).toHaveValue('+14155552671');
  });

  it('parses a resume on the same page and replaces profile fields', async () => {
    const user = userEvent.setup();
    getMyProfileMock.mockResolvedValueOnce(existingProfile);
    renderPage();

    await screen.findByRole('textbox', { name: /full name/i });
    const fileInput = screen.getByLabelText(/choose resume/i);
    const file = new File(['resume'], 'ada-v2.pdf', { type: 'application/pdf' });
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: /parse resume/i }));

    await waitFor(() => expect(parseMock).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /professional profile/i }));

    expect(await screen.findByDisplayValue('Parsed summary from resume')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Analytical Engines')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/profile/edit');
  });

  it('enables Save Changes after editing a blank field', async () => {
    const user = userEvent.setup();
    getMyProfileMock.mockResolvedValueOnce({
      ...existingProfile,
      personalDetails: {
        ...existingProfile.personalDetails,
        summary: '',
      },
    });
    renderPage();

    await screen.findByRole('textbox', { name: /full name/i });
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: /location/i }), 'London');

    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled();
  });

  it('submits changes through the update API when no new resume was parsed', async () => {
    const user = userEvent.setup();
    getMyProfileMock.mockResolvedValueOnce(existingProfile);
    updateProfileMock.mockResolvedValueOnce({ message: 'Profile updated successfully' });
    renderPage();

    await screen.findByRole('textbox', { name: /full name/i });
    await user.type(screen.getByRole('textbox', { name: /location/i }), 'London');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await user.click(screen.getByRole('button', { name: /confirm & save/i }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledTimes(1);
    });
    expect(confirmProfileMock).not.toHaveBeenCalled();
  });

  it('cancels the confirmation dialog without saving', async () => {
    const user = userEvent.setup();
    getMyProfileMock.mockResolvedValueOnce(existingProfile);
    renderPage();

    await screen.findByRole('textbox', { name: /full name/i });
    await user.type(screen.getByRole('textbox', { name: /location/i }), 'London');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(updateProfileMock).not.toHaveBeenCalled();
    expect(confirmProfileMock).not.toHaveBeenCalled();
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
