import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import type { SetupStatusDto } from '@/features/auto-apply/types/autoApply.types';

import { AutoApplyPage } from './AutoApplyPage';

vi.mock('./ProfileTab', () => ({
  ProfileTab: () => <h2>Personal & contact details</h2>,
}));

vi.mock('./AnswersTab', () => ({
  AnswersTab: () => <div>Verified answers</div>,
}));

vi.mock('./AssistedApplicationsList', () => ({
  AssistedApplicationsList: () => <div>Assisted applications list</div>,
}));
vi.mock('./SubmissionsTab', () => ({
  SubmissionsTab: () => <div>Assisted applications list</div>,
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
vi.mock('./PersonalSetupSection', () => ({
  PersonalSetupSection: () => <h2>Personal & contact details</h2>,
}));
vi.mock('./WorkAuthorizationSection', () => ({
  WorkAuthorizationSection: () => <h2>Work authorization & sponsorship</h2>,
}));
vi.mock('./JobPreferencesSetupSection', () => ({
  JobPreferencesSetupSection: () => <h2>Job preferences</h2>,
}));
vi.mock('./ProfessionalLinksSection', () => ({
  ProfessionalLinksSection: () => <h2>Professional links</h2>,
}));
vi.mock('./CommonAnswersSection', () => ({
  CommonAnswersSection: () => <h2>Common answers</h2>,
}));
vi.mock('./EducationSection', () => ({
  EducationSection: () => <h2>Education</h2>,
}));
vi.mock('./SetupSummary', () => ({
  SetupSummary: () => <aside>Setup overview</aside>,
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
    { id: 'education', label: 'Education', complete: true, required: false },
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

  it('renders Application Setup and the personal section by default', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /^Application Setup$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Personal & contact details/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('shows server-driven setup checklist percent and Continue setup (AA-020)', () => {
    renderPage();

    expect(screen.getByText(/0% complete/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue setup/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Personal & contact details, incomplete, required/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Browse jobs/i })).not.toBeInTheDocument();
  });

  it('opens work authorization directly from its section deep link', () => {
    renderPage('/auto-apply?section=work-auth');
    expect(screen.getByRole('heading', { name: /Work authorization & sponsorship/i })).toBeInTheDocument();
  });

  it('switches sections from the checklist', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Job preferences, incomplete, required/i }));
    expect(screen.getByRole('heading', { name: /Job preferences/i })).toBeInTheDocument();
  });

  it('focuses deep-linked field target on load (AA-029)', () => {
    renderPage('/auto-apply?section=resumes&field=defaultResume');

    expect(document.getElementById('setup-field-defaultResume')).toBeInTheDocument();
  });
});
