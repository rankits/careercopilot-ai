import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { useUpsertApplicationAnswer } from '@/features/auto-apply/hooks/useApplicationAnswers';
import {
  useCandidateProfile,
  useUpsertCandidateProfile,
} from '@/features/auto-apply/hooks/useCandidateProfile';

import { JobPreferencesSection } from '../JobPreferencesSection';
import { SetupDirtyProvider } from '../SetupDirtyContext';

vi.mock('@/features/auto-apply/hooks/useCandidateProfile');
vi.mock('@/features/auto-apply/hooks/useApplicationAnswers');

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SetupDirtyProvider onRequestDiscardConfirm={vi.fn()}>
          <JobPreferencesSection />
        </SetupDirtyProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('JobPreferencesSection AA-023', () => {
  const mockUpsertProfile = vi.fn();
  const mockUpsertAnswer = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockUpsertProfile.mockResolvedValue({});
    mockUpsertAnswer.mockResolvedValue({});

    vi.mocked(useCandidateProfile).mockReturnValue({
      data: {
        id: 'profile-1',
        userId: 'user-1',
        preferences: {
          desiredRoles: ['Engineer'],
          preferredLocations: ['Remote'],
          remotePreference: 'ANY',
          remotePreferences: [],
          expectedSalary: { currency: 'USD' },
          noticePeriodDays: 0,
        },
        links: {},
        createdAt: '',
        updatedAt: '',
      },
      isLoading: false,
    } as any);

    vi.mocked(useUpsertCandidateProfile).mockReturnValue({
      mutateAsync: mockUpsertProfile,
      isPending: false,
    } as any);

    vi.mocked(useUpsertApplicationAnswer).mockReturnValue({
      mutateAsync: mockUpsertAnswer,
      isPending: false,
    } as any);
  });

  it('renders job preferences section heading', () => {
    renderSection();

    expect(screen.getByRole('heading', { name: /Job preferences/i })).toBeInTheDocument();
  });

  it('blocks save when salary max is less than min', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByLabelText(/Salary is flexible/i));
    await user.type(screen.getByLabelText(/Expected salary min/i), '90000');
    const maxField = screen.getByLabelText(/Expected salary max/i);
    await user.type(maxField, '50000');
    await user.tab();

    expect(screen.getByText('Max must be greater than or equal to min.')).toBeInTheDocument();
    expect(mockUpsertProfile).not.toHaveBeenCalled();
  });

  it('syncs notice period into the answer vault on save', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByLabelText(/Willing to relocate/i));
    await user.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() =>
      expect(mockUpsertAnswer).toHaveBeenCalledWith({
        questionKey: 'notice_period_days',
        answer: '0',
        autoSubmitAllowed: false,
      }),
    );
  });
});
