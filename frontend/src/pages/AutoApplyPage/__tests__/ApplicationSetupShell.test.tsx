import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConsentsTab } from '../ConsentsTab';
import { ResumeVersionsTab } from '../ResumeVersionsTab';
import { RulesTab } from '../RulesTab';
import { SetupChecklist } from '../SetupChecklist';

vi.mock('@/features/auto-apply/hooks/useResumeVersions', () => ({
  useResumeVersions: () => ({ data: [], isLoading: false }),
  useCreateResumeVersion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateResumeVersion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteResumeVersion: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...(actual as object),
    useQuery: () => ({ data: [], isLoading: false, isError: false }),
  };
});

vi.mock('@/features/auto-apply/hooks/useApplicationRule', () => ({
  useApplicationRule: () => ({
    data: {
      blacklistedCompanySlugs: [],
      excludedTitleKeywords: [],
      excludedSources: [],
    },
    isLoading: false,
  }),
  useUpsertApplicationRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/features/auto-apply/hooks/useConsents', () => ({
  useConsents: () => ({ data: [], isLoading: false }),
  useGrantConsent: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRevokeConsent: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/features/auto-apply/hooks/usePrivacyAcknowledgement', () => ({
  usePrivacyAcknowledgement: () => ({ data: null, isLoading: false }),
  useSavePrivacyAcknowledgement: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/components/organisms/Toast/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe('Application Setup a11y AA-030', () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  afterEach(() => {
    cleanup();
  });

  function wrap(ui: ReactElement) {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('exposes labelled regions and form controls in resume, exclusions, and consents sections', () => {
    wrap(<ResumeVersionsTab />);
    expect(screen.getByRole('heading', { name: /^Resumes$/i })).toBeInTheDocument();
    expect(document.getElementById('setup-section-resumes')).toBeTruthy();
    cleanup();

    wrap(<RulesTab />);
    expect(screen.getByRole('heading', { name: /^Exclusions$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Companies to exclude/i)).toHaveAttribute(
      'id',
      'setup-field-excludedCompanies',
    );
    cleanup();

    wrap(<ConsentsTab />);
    expect(document.getElementById('setup-field-resume-usage')).toBeTruthy();
    expect(document.getElementById('setup-field-privacy-acknowledgement')).toBeTruthy();
  });

  it('renders checklist items with descriptive aria labels', () => {
    wrap(
      <SetupChecklist
        isError={false}
        isLoading={false}
        onBrowseJobs={vi.fn()}
        onRetry={vi.fn()}
        onSelectSection={vi.fn()}
        status={{
          complete: false,
          percent: 25,
          readyForAssistedApply: false,
          gaps: [],
          sections: [
            { id: 'personal', label: 'Personal & contact details', complete: false, required: true },
            { id: 'resumes', label: 'Resumes', complete: false, required: true },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole('button', { name: /Personal & contact details, incomplete, required/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Setup 25 percent complete');
  });
});
