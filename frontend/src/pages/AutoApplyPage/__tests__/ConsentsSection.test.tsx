import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  useConsents,
  useGrantConsent,
  useRevokeConsent,
} from '@/features/auto-apply/hooks/useConsents';
import {
  usePrivacyAcknowledgement,
  useSavePrivacyAcknowledgement,
} from '@/features/auto-apply/hooks/usePrivacyAcknowledgement';

import { ConsentsTab } from '../ConsentsTab';

vi.mock('@/features/auto-apply/hooks/useConsents', () => ({
  useConsents: vi.fn(),
  useGrantConsent: vi.fn(),
  useRevokeConsent: vi.fn(),
}));

vi.mock('@/features/auto-apply/hooks/usePrivacyAcknowledgement', () => ({
  usePrivacyAcknowledgement: vi.fn(),
  useSavePrivacyAcknowledgement: vi.fn(),
}));

vi.mock('@/components/organisms/Toast/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConsentsTab />
    </QueryClientProvider>,
  );
}

describe('ConsentsSection AA-028', () => {
  const mockGrant = vi.fn();
  const mockRevoke = vi.fn();
  const mockSavePrivacy = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockGrant.mockResolvedValue(undefined);
    mockRevoke.mockResolvedValue(undefined);
    mockSavePrivacy.mockResolvedValue(undefined);

    vi.mocked(useConsents).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    vi.mocked(useGrantConsent).mockReturnValue({
      mutateAsync: mockGrant,
      isPending: false,
    } as any);

    vi.mocked(useRevokeConsent).mockReturnValue({
      mutateAsync: mockRevoke,
      isPending: false,
    } as any);

    vi.mocked(usePrivacyAcknowledgement).mockReturnValue({
      data: null,
      isLoading: false,
    } as any);

    vi.mocked(useSavePrivacyAcknowledgement).mockReturnValue({
      mutateAsync: mockSavePrivacy,
      isPending: false,
    } as any);
  });

  it('renders only RESUME_USAGE and CONTENT_GENERATION consent rows (AA-002 regression)', () => {
    renderTab();

    expect(screen.getByText('Use my resume to prepare applications')).toBeInTheDocument();
    expect(
      screen.getByText('Generate tailored content (cover letters, answers) with AI'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Send applications from my connected email/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Apply automatically under my rules/i)).not.toBeInTheDocument();
  });

  it('requires confirmation before revoking RESUME_USAGE', async () => {
    const user = userEvent.setup();
    vi.mocked(useConsents).mockReturnValue({
      data: [
        {
          id: 'consent-resume',
          consentType: 'RESUME_USAGE',
          revokedAt: null,
        },
      ],
      isLoading: false,
    } as any);

    renderTab();

    await user.click(screen.getByRole('button', { name: /Turn off Use my resume/i }));
    expect(screen.getByRole('heading', { name: /Revoke resume usage/i })).toBeInTheDocument();
    expect(mockRevoke).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^Revoke$/i }));
    expect(mockRevoke).toHaveBeenCalledWith('consent-resume');
  });

  it('shows privacy acknowledgement checkbox until saved', () => {
    renderTab();

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save acknowledgement/i })).toBeDisabled();
  });

  it('shows acknowledged date when privacy is already saved', () => {
    vi.mocked(usePrivacyAcknowledgement).mockReturnValue({
      data: {
        policyVersion: '2026-08-01',
        acknowledgedAt: '2026-08-05T12:00:00.000Z',
      },
      isLoading: false,
    } as any);

    renderTab();

    expect(screen.getByText(/Acknowledged on/i)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/I have read and agree to the Privacy Policy/i),
    ).not.toBeInTheDocument();
  });
});
