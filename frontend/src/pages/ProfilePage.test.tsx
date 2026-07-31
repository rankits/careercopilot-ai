import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { authReducer } from '@/features/auth/authSlice';
import type {
  ResumeParseCallbacks,
  ResumeProfileFormValues,
} from '@/features/resume/types/resume.types';

import { ProfilePage } from './ProfilePage';

const { confirmProfileMock, parseMock } = vi.hoisted(() => ({
  confirmProfileMock: vi.fn(),
  parseMock: vi.fn(),
}));

vi.mock('@/features/resume/services/resume.service', () => ({
  resumeService: { confirmProfile: confirmProfileMock, parse: parseMock },
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

function renderPage(onSave = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const store = configureStore({ reducer: { auth: authReducer } });
  render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ToastProvider>
          <MemoryRouter>
            <ProfilePage onSave={onSave} />
            <LocationDisplay />
          </MemoryRouter>
        </ToastProvider>
      </Provider>
    </QueryClientProvider>,
  );
  return { onSave, store };
}

async function uploadResume(user: ReturnType<typeof userEvent.setup>, name = 'resume.pdf') {
  await user.upload(
    screen.getByLabelText(/choose resume/i),
    new File(['resume'], name, { type: 'application/pdf' }),
  );
  await user.click(screen.getByRole('button', { name: /parse resume/i }));
}

describe('ProfilePage resume parsing', () => {
  beforeEach(() => {
    confirmProfileMock.mockReset();
    confirmProfileMock.mockResolvedValue({ message: 'Profile created successfully' });
    parseMock.mockReset();
  });

  it('auto-populates all available profile values and allows editing', async () => {
    const user = userEvent.setup();
    parseMock.mockResolvedValueOnce(parsed);
    renderPage();

    await uploadResume(user);

    expect(await screen.findByRole('textbox', { name: /full name/i })).toHaveValue('Ada Lovelace');
    expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('ada@example.com');

    await user.click(screen.getByRole('button', { name: /^skills/i }));
    expect(screen.getByRole('textbox', { name: /skills/i })).toHaveValue('Algorithms');

    await user.click(screen.getByRole('button', { name: /^professional profile/i }));
    expect(screen.getByRole('textbox', { name: /summary/i })).toHaveValue('Computing pioneer');

    await user.clear(screen.getByRole('textbox', { name: /summary/i }));
    await user.type(screen.getByRole('textbox', { name: /summary/i }), 'Edited summary');
    expect(screen.getByRole('textbox', { name: /summary/i })).toHaveValue('Edited summary');
  }, 30_000);

  it('clears old values and manual edits before parsing a replacement resume', async () => {
    const user = userEvent.setup();
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
  }, 30_000);

  it('validates required fields and submits the latest edited values', async () => {
    const user = userEvent.setup();
    const { onSave } = renderPage();

    expect(screen.getByRole('button', { name: /save profile/i })).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: /full name/i }), 'Ada Lovelace');
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'ada@example.com');
    await user.type(screen.getByRole('textbox', { name: /phone number/i }), '+44 1234');

    await user.click(screen.getByRole('button', { name: /^professional profile/i }));
    await user.type(screen.getByRole('textbox', { name: /current designation/i }), 'Engineer');
    await user.type(screen.getByRole('textbox', { name: /total experience/i }), '8');
    await user.type(
      screen.getByRole('textbox', { name: /professional summary/i }),
      'Updated by user',
    );

    await user.click(screen.getByRole('button', { name: /^skills/i }));
    await user.type(screen.getByRole('textbox', { name: /skills/i }), 'Algorithms');
    expect(screen.getByRole('button', { name: /save profile/i })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /save profile/i }));
    expect(screen.getByRole('dialog', { name: /confirm profile submission/i })).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining<Partial<ResumeProfileFormValues>>({
        email: 'ada@example.com',
        fullName: 'Ada Lovelace',
        summary: 'Updated by user',
      }),
    );
  }, 30_000);

  it('confirms a parsed profile and navigates to the job feed', async () => {
    const user = userEvent.setup();
    parseMock.mockImplementationOnce((_file: File, callbacks: ResumeParseCallbacks) => {
      callbacks.onUploaded?.('resume-1');
      return Promise.resolve(parsed);
    });
    const { onSave, store } = renderPage();

    await uploadResume(user);
    await user.click(screen.getByRole('button', { name: /save profile/i }));
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() =>
      expect(confirmProfileMock).toHaveBeenCalledWith({
        resumeId: 'resume-1',
        userId: 'public',
      }),
    );
    expect(onSave).toHaveBeenCalled();
    expect(await screen.findByText(/profile created successfully/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/jobs-feed'), {
      timeout: 1500,
    });
    expect(store.getState().auth.isProfileComplete).toBe(true);
  });

  it('cancels profile confirmation without submitting', async () => {
    const user = userEvent.setup();
    parseMock.mockResolvedValueOnce(parsed);
    const { onSave } = renderPage();

    await uploadResume(user);
    await user.click(screen.getByRole('button', { name: /save profile/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onSave).not.toHaveBeenCalled();
    expect(confirmProfileMock).not.toHaveBeenCalled();
  });
});
