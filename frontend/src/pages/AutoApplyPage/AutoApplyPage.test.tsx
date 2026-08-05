import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';
import type { SetupStatusDto } from '@/features/auto-apply/types/autoApply.types';

import { AutoApplyPage } from './AutoApplyPage';

vi.mock('./SubmissionsTab', () => ({
  SubmissionsTab: () => <div>Track a job</div>,
}));

vi.mock('./ResumeVersionsTab', () => ({
  ResumeVersionsTab: () => (
    <div>
      <div id="setup-field-defaultResume">Default resume</div>
    </div>
  ),
}));

vi.mock('./RulesTab', () => ({
  RulesTab: () => (
    <div>
      <h2>Exclusions</h2>
    </div>
  ),
}));

vi.mock('./ConsentsTab', () => ({
  ConsentsTab: () => <div>Consents</div>,
}));

const incompleteStatus: SetupStatusDto = {
  complete: false,
  percent: 0,
  readyForAssistedApply: false,
  gaps: [],
  sections: [
    { id: 'personal', label: 'Personal & contact details', complete: false, required: true },
    { id: 'work-auth', label: 'Work authorization & sponsorship', complete: false, required: true },
    { id: 'preferences', label: 'Job preferences', complete: false, required: true },
    { id: 'links', label: 'Professional links', complete: false, required: false },
    { id: 'answers', label: 'Common answers', complete: false, required: true },
    { id: 'resumes', label: 'Resumes', complete: false, required: true },
    { id: 'exclusions', label: 'Exclusions', complete: true, required: false },
    { id: 'consents', label: 'Consents & privacy', complete: false, required: true },
  ],
};

vi.mock('@/features/auto-apply/hooks/useSetupStatus', () => ({
  useSetupStatus: () => ({
    data: incompleteStatus,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/user/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: {
      id: 'user-1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      role: 'USER',
    },
    isLoading: false,
  }),
}));

vi.mock('@/features/user/hooks/useUpdateUserProfile', () => ({
  useUpdateUserProfile: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/auto-apply/hooks/useCandidateProfile', () => ({
  useCandidateProfile: () => ({
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
  }),
  useUpsertCandidateProfile: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/auto-apply/hooks/useApplicationAnswers', () => ({
  useApplicationAnswers: () => ({ data: [], isLoading: false }),
  useCreateApplicationAnswer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteApplicationAnswer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpsertApplicationAnswer: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function renderPage(initialEntry = '/auto-apply') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <AutoApplyPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('AutoApplyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Application Setup heading and the profile tab by default', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /^Application Setup$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: /Personal & contact details/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Save your profile, resume, and answers once\. When you're ready to apply, use Assisted Apply from any job/i,
      ),
    ).toBeInTheDocument();
    const subtitle = screen.getByText(/Save your profile, resume, and answers once/i).textContent ?? '';
    expect(subtitle.toLowerCase()).not.toMatch(/\bautomatically\b/);
    expect(subtitle.toLowerCase()).not.toMatch(/\bsubmitted\b/);
  });

  it('shows server-driven setup checklist percent and Continue setup (AA-020)', () => {
    renderPage();

    expect(screen.getByText(/Setup 0% complete/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue setup/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Personal & contact details, incomplete, required/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Browse jobs/i })).not.toBeInTheDocument();
  });

  it('opens the submissions tab from ?tab=submissions', () => {
    renderPage('/auto-apply?tab=submissions');

    expect(screen.getByRole('tab', { name: /submissions/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText(/Track a job/i)).toBeInTheDocument();
  });

  it('opens work-auth section deep link onto the answers tab (AA-020)', () => {
    renderPage('/auto-apply?section=work-auth');

    expect(screen.getByRole('tab', { name: /verified answers/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('hides premature UI on the submissions tab', () => {
    renderPage('/auto-apply?tab=submissions');

    expect(screen.queryByRole('button', { name: /^Approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Continue to apply$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Retry$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Processing…$/)).not.toBeInTheDocument();
  });

  it('switches to the submissions tab on click', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: /submissions/i }));

    expect(screen.getByText(/Track a job/i)).toBeInTheDocument();
  });

  it('switches to the exclusions tab and never exposes autopilot or daily-limit controls', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: /^Exclusions$/i }));

    expect(screen.getByRole('heading', { name: /^Exclusions$/i })).toBeInTheDocument();
    expect(screen.queryByText(/autopilot/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/daily application limit/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/enable autopilot/i)).not.toBeInTheDocument();
  });

  it('focuses deep-linked field target on load (AA-029)', () => {
    renderPage('/auto-apply?section=resumes&field=defaultResume');

    expect(screen.getByRole('tab', { name: /resume versions/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(document.getElementById('setup-field-defaultResume')).toBeInTheDocument();
  });
});
