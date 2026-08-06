import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { authReducer } from '@/features/auth/authSlice';
import type { AuthState } from '@/features/auth/types/auth.types';
import type {
  ResumeParseCallbacks,
  ResumeProfileFormValues,
} from '@/features/resume/types/resume.types';

import { ProfilePage } from './ProfilePage';

const { confirmProfileMock, parseMock, getMyProfileMock, updateProfileMock } = vi.hoisted(() => ({
  confirmProfileMock: vi.fn(),
  getMyProfileMock: vi.fn(),
  parseMock: vi.fn(),
  updateProfileMock: vi.fn(),
}));

vi.mock('@/features/resume/services/resume.service', () => ({
  resumeService: {
    confirmProfile: confirmProfileMock,
    getMyProfile: getMyProfileMock,
    parse: parseMock,
    updateProfile: updateProfileMock,
  },
}));

const parsed = {
  currentPosition: { company: 'Analytical Engines', title: 'Engineer' },
  personalInformation: {
    email: 'ada@example.com',
    fullName: 'Ada Lovelace',
    location: { city: 'London', country: 'UK' },
    phone: '+44 1234',
  },
  professionalSummary: 'Computing pioneer',
  skills: { technical: ['Algorithms'] },
  totalExperienceYears: 8,
};

function LocationDisplay() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    clear: () => {
      store = {};
    },
    getItem: (key: string) => store[key] ?? null,
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: localStorageMock,
  writable: true,
});

const AUTHENTICATED_STATE: AuthState = {
  accessToken: 'token',
  error: null,
  isAuthenticated: true,
  isLoading: false,
  isProfileComplete: false,
  isSessionResolved: true,
  user: {
    email: 'ada@example.com',
    id: 'user-1',
    role: 'USER',
  },
};

function renderPage(
  onSave = vi.fn(),
  mode?: 'edit' | 'onboarding',
  authState: AuthState = AUTHENTICATED_STATE,
) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const store = configureStore({
    preloadedState: { auth: authState },
    reducer: { auth: authReducer },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ToastProvider>
          <MemoryRouter>
            <ProfilePage mode={mode} onSave={onSave} />
            <LocationDisplay />
          </MemoryRouter>
        </ToastProvider>
      </Provider>
    </QueryClientProvider>,
  );
  return { onSave, store };
}

function setupUser() {
  // Parse success opens a bottom Snackbar over the sticky save bar; skip pointer-events
  // checks so clicks are not blocked when the suite is under load.
  return userEvent.setup({ delay: null, pointerEventsCheck: 0 });
}

async function uploadResume(user: ReturnType<typeof userEvent.setup>, name = 'resume.pdf') {
  await user.upload(
    screen.getByLabelText(/choose resume/i),
    new File(['resume'], name, { type: 'application/pdf' }),
  );
  await user.click(screen.getByRole('button', { name: /parse resume/i }));
}

async function dismissOpenAlerts(user: ReturnType<typeof userEvent.setup>) {
  const parseNotice = /resume parsed\. review your details before continuing/i;
  if (!screen.queryByText(parseNotice)) return;

  const closeButtons = screen.queryAllByRole('button', { name: /^close$/i });
  for (const button of closeButtons) {
    await user.click(button);
  }
  await waitFor(() => {
    expect(screen.queryByText(parseNotice)).not.toBeInTheDocument();
  });
}

async function waitForParsedProfile() {
  await waitFor(() => {
    expect(screen.getByRole('textbox', { name: /full name/i })).toHaveValue('Ada Lovelace');
  });
  await waitFor(() => expect(screen.getByRole('button', { name: /save profile/i })).toBeEnabled());
}

async function openConfirmDialog(user: ReturnType<typeof userEvent.setup>) {
  await dismissOpenAlerts(user);
  const form = document.getElementById('profile-review-form');
  if (form) {
    fireEvent.submit(form);
  } else {
    await user.click(screen.getByRole('button', { name: /save profile & continue|save changes/i }));
  }
  return waitFor(() => screen.getByRole('dialog'), { timeout: 5_000 });
}

async function confirmDialog(
  user: ReturnType<typeof userEvent.setup>,
  actionName: RegExp = /^save & continue$/i,
) {
  const dialog = await waitFor(() => screen.getByRole('dialog'), { timeout: 5_000 });
  await user.click(within(dialog).getByRole('button', { name: actionName }));
}

function fillField(label: RegExp, value: string) {
  fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value } });
}

describe('ProfilePage resume parsing', () => {
  beforeEach(() => {
    confirmProfileMock.mockReset();
    confirmProfileMock.mockResolvedValue({ message: 'Profile created successfully' });
    parseMock.mockReset();
  });

  it('auto-populates all available profile values and allows editing', async () => {
    const user = setupUser();
    parseMock.mockResolvedValueOnce(parsed);
    renderPage();

    await uploadResume(user);

    expect(await screen.findByRole('textbox', { name: /full name/i })).toHaveValue('Ada Lovelace');
    expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('ada@example.com');

    await user.click(screen.getByRole('button', { name: /^skills/i }));
    expect(screen.getByRole('textbox', { name: /skills/i })).toHaveValue('Algorithms');

    await user.click(screen.getByRole('button', { name: /^professional profile/i }));
    expect(screen.getByRole('textbox', { name: /summary/i })).toHaveValue('Computing pioneer');

    await dismissOpenAlerts(user);
    await user.clear(screen.getByRole('textbox', { name: /summary/i }));
    await user.type(screen.getByRole('textbox', { name: /summary/i }), 'Edited summary');
    expect(screen.getByRole('textbox', { name: /summary/i })).toHaveValue('Edited summary');
  }, 60_000);

  it('clears old values and manual edits before parsing a replacement resume', async () => {
    const user = setupUser();
    parseMock.mockResolvedValue(parsed);
    renderPage();
    await uploadResume(user);

    const name = await screen.findByRole('textbox', { name: /full name/i });
    await user.clear(name);
    await user.type(name, 'Grace Hopper');
    await user.upload(
      screen.getByLabelText(/choose resume/i),
      new File(['replacement'], 'replacement.pdf', { type: 'application/pdf' }),
    );
    expect(name).toHaveValue('');

    await user.click(screen.getByRole('button', { name: /parse resume/i }));

    expect(await screen.findByRole('textbox', { name: /full name/i })).toHaveValue('Ada Lovelace');
  }, 60_000);

  it('validates required fields and submits the latest edited values', async () => {
    const user = setupUser();
    const { onSave } = renderPage();

    expect(screen.getByRole('button', { name: /save profile/i })).toBeDisabled();

    fillField(/full name/i, 'Ada Lovelace');
    fillField(/email/i, 'ada@example.com');
    fillField(/phone number/i, '+44 1234');

    await user.click(screen.getByRole('button', { name: /^professional profile/i }));
    fillField(/current designation/i, 'Engineer');
    fillField(/total experience/i, '8');
    fillField(/professional summary/i, 'Updated by user');

    await user.click(screen.getByRole('button', { name: /^skills/i }));
    fillField(/skills/i, 'Algorithms');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save profile/i })).toBeEnabled();
    });
    await openConfirmDialog(user);
    expect(screen.getByRole('dialog', { name: /confirm profile submission/i })).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    await confirmDialog(user);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ResumeProfileFormValues>>({
          email: 'ada@example.com',
          fullName: 'Ada Lovelace',
          summary: 'Updated by user',
        }),
      );
    });
  }, 30_000);

  it('confirms a parsed profile and navigates to the job feed', async () => {
    const user = setupUser();
    parseMock.mockImplementationOnce((_file: File, callbacks: ResumeParseCallbacks) => {
      callbacks.onUploaded?.('resume-1');
      return Promise.resolve(parsed);
    });
    const { onSave, store } = renderPage();

    await uploadResume(user);
    await waitForParsedProfile();
    await openConfirmDialog(user);
    await confirmDialog(user);

    await waitFor(() =>
      expect(confirmProfileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          resumeId: 'resume-1',
          userId: 'user-1',
          certifications: [],
          education: [],
          experience: [],
          personalDetails: expect.objectContaining({
            currentCompany: 'Analytical Engines',
            designation: 'Engineer',
            email: 'ada@example.com',
            fullName: 'Ada Lovelace',
            location: 'London, UK',
            phone: '+44 1234',
            projects: [],
            summary: 'Computing pioneer',
            totalExperience: '8',
          }),
          skills: ['Algorithms'],
        }),
      ),
    );
    expect(onSave).toHaveBeenCalled();
    await waitFor(() => expect(store.getState().auth.isProfileComplete).toBe(true), {
      timeout: 10_000,
    });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/jobs-feed'), {
      timeout: 10_000,
    });
  }, 30_000);

  it('refuses to confirm a profile when no user is signed in', async () => {
    const user = setupUser();
    parseMock.mockImplementationOnce((_file: File, callbacks: ResumeParseCallbacks) => {
      callbacks.onUploaded?.('resume-1');
      return Promise.resolve(parsed);
    });
    renderPage(vi.fn(), 'onboarding', {
      ...AUTHENTICATED_STATE,
      isAuthenticated: false,
      user: null,
    });

    await uploadResume(user);
    await waitForParsedProfile();
    await openConfirmDialog(user);
    await confirmDialog(user);

    expect(
      await screen.findByText(/you must be signed in to confirm your profile/i),
    ).toBeInTheDocument();
    expect(confirmProfileMock).not.toHaveBeenCalled();
  }, 30_000);

  it('cancels profile confirmation without submitting', async () => {
    const user = setupUser();
    parseMock.mockResolvedValueOnce(parsed);
    const { onSave } = renderPage();

    await uploadResume(user);
    await waitForParsedProfile();
    const dialog = await openConfirmDialog(user);
    await user.click(within(dialog).getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onSave).not.toHaveBeenCalled();
    expect(confirmProfileMock).not.toHaveBeenCalled();
  }, 15_000);
});

const existingProfile = {
  certifications: [],
  education: [],
  experience: [],
  isComplete: true,
  personalDetails: {
    designation: 'Engineer',
    email: 'ada@example.com',
    fullName: 'Ada Lovelace',
    phone: '+44 1234',
    summary: 'Computing pioneer',
    totalExperience: '8',
  },
  skills: ['Algorithms'],
  sourceResumeId: null,
  userId: 'user-1',
};

describe('ProfilePage edit mode', () => {
  beforeEach(() => {
    getMyProfileMock.mockReset();
    updateProfileMock.mockReset();
  });

  it('submits changes through the update API, shows a success message, and stays on the page', async () => {
    const user = setupUser();
    getMyProfileMock.mockResolvedValueOnce(existingProfile);
    updateProfileMock.mockResolvedValueOnce({
      message: 'Candidate profile updated',
      profile: existingProfile,
    });
    renderPage(vi.fn(), 'edit');

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /full name/i })).toHaveValue('Ada Lovelace');
    });
    await openConfirmDialog(user);
    expect(screen.getByRole('dialog', { name: /confirm profile changes/i })).toBeInTheDocument();

    await confirmDialog(user, /^confirm & save$/i);

    await waitFor(() => expect(updateProfileMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/candidate profile updated/i)).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('shows an error toast when the update API call fails', async () => {
    const user = setupUser();
    getMyProfileMock.mockResolvedValueOnce(existingProfile);
    updateProfileMock.mockRejectedValueOnce(new Error('Unable to reach the resume service.'));
    renderPage(vi.fn(), 'edit');

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /full name/i })).toHaveValue('Ada Lovelace');
    });
    await openConfirmDialog(user);
    await confirmDialog(user, /^confirm & save$/i);

    expect(await screen.findByText(/unable to reach the resume service/i)).toBeInTheDocument();
  });
});
