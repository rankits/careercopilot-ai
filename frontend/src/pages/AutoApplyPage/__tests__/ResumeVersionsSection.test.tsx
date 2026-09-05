import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  useCreateResumeVersion,
  useDeleteResumeVersion,
  useResumeVersions,
  useUpdateResumeVersion,
} from '@/features/auto-apply/hooks/useResumeVersions';

import { ResumeVersionsTab } from '../ResumeVersionsTab';

vi.mock('@/features/auto-apply/hooks/useResumeVersions', () => ({
  useResumeVersions: vi.fn(),
  useCreateResumeVersion: vi.fn(),
  useUpdateResumeVersion: vi.fn(),
  useDeleteResumeVersion: vi.fn(),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...(actual as object),
    useQuery: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
  };
});

vi.mock('@/components/organisms/Toast/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ResumeVersionsTab />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ResumeVersionsTab AA-026', () => {
  const mockCreate = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockCreate.mockResolvedValue({});
    mockUpdate.mockResolvedValue({});
    mockDelete.mockResolvedValue({ newDefaultResumeVersionId: null, newDefaultLabel: null });

    vi.mocked(useResumeVersions).mockReturnValue({ data: [], isLoading: false } as any);
    vi.mocked(useCreateResumeVersion).mockReturnValue({
      mutateAsync: mockCreate,
      isPending: false,
    } as any);
    vi.mocked(useUpdateResumeVersion).mockReturnValue({
      mutateAsync: mockUpdate,
      isPending: false,
    } as any);
    vi.mocked(useDeleteResumeVersion).mockReturnValue({
      mutateAsync: mockDelete,
      isPending: false,
    } as any);
  });

  it('shows empty state copy and Open Resume Builder CTA', () => {
    renderTab();

    expect(screen.getByText('No approved resumes yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Resume Builder/i })).toHaveAttribute(
      'href',
      '/resume-builder',
    );
  });

  it('shows Default badge and Set as default for non-default rows', () => {
    vi.mocked(useResumeVersions).mockReturnValue({
      data: [
        {
          id: 'v1',
          resumeId: 'r1',
          label: 'Primary',
          category: 'General',
          tags: [],
          isActive: true,
        },
        {
          id: 'v2',
          resumeId: 'r2',
          label: 'Secondary',
          category: 'General',
          tags: [],
          isActive: false,
        },
      ],
      isLoading: false,
    } as any);

    renderTab();

    expect(screen.getByLabelText('Default resume')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Set Secondary as default/i })).toBeInTheDocument();
  });

  it('opens delete confirmation modal', async () => {
    const user = userEvent.setup();
    vi.mocked(useResumeVersions).mockReturnValue({
      data: [
        {
          id: 'v1',
          resumeId: 'r1',
          label: 'Primary',
          category: 'General',
          tags: [],
          isActive: true,
        },
      ],
      isLoading: false,
    } as any);

    renderTab();

    await user.click(screen.getByRole('button', { name: /Delete Primary from Assisted Apply/i }));

    expect(
      screen.getByRole('heading', { name: /Delete this resume from Assisted Apply/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/This won't delete it from Resume Builder/i)).toBeInTheDocument();
  });
});
