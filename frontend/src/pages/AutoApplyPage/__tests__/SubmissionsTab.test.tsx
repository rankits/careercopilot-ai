import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { useCandidateProfile } from '@/features/auto-apply/hooks/useCandidateProfile';
import { useConsents } from '@/features/auto-apply/hooks/useConsents';
import { useResumeVersions } from '@/features/auto-apply/hooks/useResumeVersions';
import { useSubmissions, useWithdrawSubmission } from '@/features/auto-apply/hooks/useSubmissions';

import { SubmissionsTab } from '../SubmissionsTab';

// Mock the hooks
vi.mock('@/features/auto-apply/hooks/useSubmissions', () => ({
  useSubmissions: vi.fn(() => ({ data: [], isLoading: false })),
  useApproveSubmission: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useConfirmSubmission: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteSubmission: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useInitiateSubmission: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useQueueSubmission: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useReopenSubmission: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRetrySubmission: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useWithdrawSubmission: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock('@/features/auto-apply/hooks/useCandidateProfile');
vi.mock('@/features/auto-apply/hooks/useConsents');
vi.mock('@/features/auto-apply/hooks/useResumeVersions');
vi.mock('@/features/auto-apply/hooks/usePlan', () => ({
  useCreatePlan: () => ({ mutateAsync: vi.fn() }),
  loadSubmissionReview: vi.fn(),
}));

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ToastProvider>
          <SubmissionsTab />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SubmissionsTab AA-001', () => {
  const mockWithdraw = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    // Default mock returns to pass the setup complete guard
    vi.mocked(useCandidateProfile).mockReturnValue({ data: { id: 'profile-1' } } as any);
    vi.mocked(useConsents).mockReturnValue({
      data: [{ consentType: 'RESUME_USAGE', revokedAt: null }],
    } as any);
    vi.mocked(useResumeVersions).mockReturnValue({
      data: [{ id: '1', tags: ['auto-apply-approved'] }],
    } as any);

    vi.mocked(useWithdrawSubmission).mockReturnValue({
      mutateAsync: mockWithdraw,
      isPending: false,
    } as any);

    // Set environment flag to simulate Phase 1 UI (true by default usually, but we mock it safely or rely on vitest environment)
    // The component uses import.meta.env.VITE_ASSISTED_APPLY_PHASE1_UI.
    vi.stubEnv('VITE_ASSISTED_APPLY_PHASE1_UI', 'true');
  });

  const mockSubmission = (status: string, overrides = {}) => {
    vi.mocked(useSubmissions).mockReturnValue({
      data: [
        {
          id: 'sub-1',
          jobId: 'job-1',
          status,
          jobTitle: 'Software Engineer',
          companySlug: 'acme-corp',
          ...overrides,
        },
      ],
      isLoading: false,
    } as any);
  };

  it('Happy path: READY_FOR_REVIEW does not show Approve button', () => {
    mockSubmission('READY_FOR_REVIEW');
    renderTab();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(
      screen.getByText(/Continue this application from the job page's Assisted Apply workspace/i),
    ).toBeInTheDocument();
  });

  it('Legacy status: APPROVED shows LegacyAttentionBanner instead of Continue to apply', () => {
    mockSubmission('APPROVED');
    renderTab();
    expect(screen.queryByRole('button', { name: 'Continue to apply' })).not.toBeInTheDocument();
    expect(screen.getByText('This application needs attention')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abandon' })).toBeInTheDocument();
  });

  it('Legacy status: QUEUED/SUBMITTING shows banner instead of Processing...', () => {
    mockSubmission('QUEUED');
    renderTab();
    expect(screen.queryByText('Processing…')).not.toBeInTheDocument();
    expect(screen.getByText('This application needs attention')).toBeInTheDocument();
  });

  it('Legacy status: SUBMISSION_FAILED shows banner instead of Retry', () => {
    mockSubmission('SUBMISSION_FAILED', { failureMessage: 'Network error' });
    renderTab();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.getByText('This application needs attention')).toBeInTheDocument();
  });

  it("Preserved control: ACTION_REQUIRED shows Open application and I've applied", () => {
    mockSubmission('ACTION_REQUIRED', { externalConfirmationUrl: 'https://example.com/apply' });
    renderTab();
    expect(screen.getByRole('link', { name: /Open application/i })).toHaveAttribute(
      'href',
      'https://example.com/apply',
    );
    expect(screen.getByRole('button', { name: "I've applied" })).toBeInTheDocument();
  });

  it('Abandon happy path disables button and calls mutate', async () => {
    mockSubmission('APPROVED');
    mockWithdraw.mockResolvedValueOnce({});
    const user = userEvent.setup();
    renderTab();

    const abandonBtn = screen.getByRole('button', { name: 'Abandon' });
    await user.click(abandonBtn);

    expect(mockWithdraw).toHaveBeenCalledWith('sub-1');
  });

  it('Abandon failure shows error toast and enables button again', async () => {
    mockSubmission('APPROVED');
    mockWithdraw.mockRejectedValueOnce(new Error('Failed!'));
    const user = userEvent.setup();
    renderTab();

    const abandonBtn = screen.getByRole('button', { name: 'Abandon' });
    await user.click(abandonBtn);

    expect(mockWithdraw).toHaveBeenCalledWith('sub-1');
    await waitFor(() => {
      expect(screen.getByText('Failed!')).toBeInTheDocument();
    });
  });

  it('Flag off (dogfood rollback): original controls reappear', () => {
    vi.stubEnv('VITE_ASSISTED_APPLY_PHASE1_UI', 'false');
    mockSubmission('APPROVED');
    renderTab();

    expect(screen.getByRole('button', { name: 'Continue to apply' })).toBeInTheDocument();
    expect(screen.queryByText('This application needs attention')).not.toBeInTheDocument();
  });

  it('Empty state shows no banner', () => {
    vi.mocked(useSubmissions).mockReturnValue({ data: [], isLoading: false } as any);
    renderTab();
    expect(screen.queryByText('This application needs attention')).not.toBeInTheDocument();
  });
});
