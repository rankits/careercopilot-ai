import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import type {
  ApplicationListFilters,
  ApplicationListResult,
} from '@/features/applications/hooks/useApplications';

import type { ApplicationRecord } from '@/features/applications/types/application.view.types';

import { ApplicationsPage } from './ApplicationsPage';

type MockApplicationsQuery = {
  data: ApplicationListResult;
  error: null;
  isError: false;
  isLoading: false;
  refetch: ReturnType<typeof vi.fn>;
};

const mockApplicationRecords: ApplicationRecord[] = [
  {
    appliedDate: 'May 8, 2025',
    archivedAt: null,
    avatarColor: '#4285F4',
    company: 'Google',
    id: '1',
    initials: 'G',
    interest: 5,
    isArchived: false,
    location: 'Mountain View, CA',
    priority: 'high',
    source: 'platform-apply',
    status: 'interview',
    title: 'Senior Frontend Engineer',
    updatedAt: '1h ago',
  },
  {
    appliedDate: 'May 5, 2025',
    archivedAt: null,
    avatarColor: '#0078D4',
    company: 'Microsoft',
    id: '2',
    initials: 'MS',
    interest: 4,
    isArchived: false,
    location: 'Redmond, WA',
    priority: 'medium',
    source: 'platform-job',
    status: 'screening',
    title: 'Full Stack Developer',
    updatedAt: '3h ago',
  },
  {
    appliedDate: 'May 2, 2025',
    archivedAt: null,
    avatarColor: '#635BFF',
    company: 'Stripe',
    id: '3',
    initials: 'S',
    interest: 5,
    isArchived: false,
    location: 'San Francisco, CA',
    priority: 'high',
    source: 'external-url',
    status: 'applied',
    title: 'Software Engineer',
    updatedAt: 'Yesterday',
  },
  {
    appliedDate: 'Apr 28, 2025',
    archivedAt: null,
    avatarColor: '#FF5A5F',
    company: 'Airbnb',
    id: '4',
    initials: 'A',
    interest: 3,
    isArchived: false,
    location: 'San Francisco, CA',
    priority: 'medium',
    source: 'platform-job',
    status: 'preparing',
    title: 'Frontend Developer',
    updatedAt: '2d ago',
  },
  {
    appliedDate: 'Apr 22, 2025',
    archivedAt: null,
    avatarColor: '#1877F2',
    company: 'Meta',
    id: '5',
    initials: 'M',
    interest: 4,
    isArchived: false,
    location: 'Menlo Park, CA',
    priority: 'high',
    source: 'external-url',
    status: 'assessment',
    title: 'Product Engineer',
    updatedAt: '3d ago',
  },
  {
    appliedDate: 'Apr 18, 2025',
    archivedAt: null,
    avatarColor: '#E50914',
    company: 'Netflix',
    id: '6',
    initials: 'N',
    interest: 2,
    isArchived: false,
    location: 'Los Gatos, CA',
    priority: 'low',
    source: 'platform-apply',
    status: 'preparing',
    title: 'Backend Engineer',
    updatedAt: '4d ago',
  },
  {
    appliedDate: 'Apr 10, 2025',
    archivedAt: null,
    avatarColor: '#FF9900',
    company: 'Amazon',
    id: '7',
    initials: 'AM',
    interest: 5,
    isArchived: false,
    location: 'Seattle, WA',
    priority: 'high',
    source: 'external-url',
    status: 'offer',
    title: 'Software Development Engineer',
    updatedAt: '5d ago',
  },
  {
    appliedDate: 'Apr 2, 2025',
    archivedAt: null,
    avatarColor: '#FF0000',
    company: 'Adobe',
    id: '8',
    initials: 'AD',
    interest: 3,
    isArchived: false,
    location: 'San Jose, CA',
    priority: 'medium',
    source: 'platform-job',
    status: 'rejected',
    title: 'UI/UX Engineer',
    updatedAt: '1w ago',
  },
];

const mockApplicationPagination = {
  hasNextPage: true,
  hasPreviousPage: false,
  limit: 10,
  page: 1,
  totalItems: 24,
  totalPages: 3,
};

const mockUseApplications = vi.fn<(filters: ApplicationListFilters) => MockApplicationsQuery>();

vi.mock('@/features/applications/hooks/useApplications', () => ({
  useApplications: (filters: ApplicationListFilters) => mockUseApplications(filters),
}));

vi.mock('@/features/applications/hooks/useExportApplications', () => ({
  useExportApplications: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/features/applications/hooks/useApplicationMutations', () => ({
  useAddApplicationNote: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useAddApplicationTask: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useArchiveApplication: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useDeleteApplication: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useDeleteApplicationNote: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useDeleteApplicationTask: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useTransitionApplicationStatus: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useUpdateApplication: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useUpdateApplicationTask: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/features/applications/hooks/useApplicationDetail', () => ({
  useApplicationDetail: () => ({
    data: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

function renderApplicationsPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ApplicationsPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function setupDefaultMocks() {
  mockUseApplications.mockReturnValue({
    data: {
      pagination: mockApplicationPagination,
      records: mockApplicationRecords,
    },
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
}

describe('ApplicationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('renders the applications dashboard mockup content', () => {
    renderApplicationsPage();

    expect(screen.getByText(/career workspace/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /applications/i })).toBeInTheDocument();
    expect(
      screen.getByText(/track and manage all your job applications in one place/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add application/i })).toBeInTheDocument();
    expect(screen.getByText(/total applications/i)).toBeInTheDocument();
    expect(screen.getByText(/interview stage/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /interview/i })).toBeInTheDocument();
    expect(screen.getByText(/senior frontend engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/ui\/ux engineer/i)).toBeInTheDocument();
  });

  it('filters applications by status tab', async () => {
    const user = userEvent.setup();

    mockUseApplications.mockImplementation(({ activeTab }: { activeTab: string }) => ({
      data: {
        pagination: {
          ...mockApplicationPagination,
          totalItems: activeTab === 'offer' ? 1 : mockApplicationPagination.totalItems,
        },
        records:
          activeTab === 'offer'
            ? mockApplicationRecords.filter((record) => record.status === 'offer')
            : mockApplicationRecords,
      },
      error: null,
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    }));

    renderApplicationsPage();

    await user.click(screen.getByRole('tab', { name: /offer/i }));

    expect(mockUseApplications).toHaveBeenLastCalledWith(
      expect.objectContaining({ activeTab: 'offer' }),
    );
    expect(screen.getByText(/software development engineer/i)).toBeInTheDocument();
    expect(screen.queryByText(/senior frontend engineer/i)).not.toBeInTheDocument();
  });

  it('filters applications by search query', async () => {
    const user = userEvent.setup();

    renderApplicationsPage();

    await user.type(screen.getByPlaceholderText(/search by company or job title/i), 'Stripe');

    expect(mockUseApplications).toHaveBeenLastCalledWith(
      expect.objectContaining({ searchQuery: 'Stripe' }),
    );
  });

  it('opens the add application dialog', async () => {
    const user = userEvent.setup();

    renderApplicationsPage();

    await user.click(screen.getByRole('button', { name: /add application/i }));

    expect(screen.getByRole('heading', { name: /^add application$/i })).toBeInTheDocument();
  });

  it('switches between grid and list views', async () => {
    const user = userEvent.setup();

    renderApplicationsPage();

    expect(screen.getByLabelText(/applications grid/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /list view/i }));

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByLabelText(/applications grid/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /grid view/i }));

    expect(screen.getByLabelText(/applications grid/i)).toBeInTheDocument();
  });
});
