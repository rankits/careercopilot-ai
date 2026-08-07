import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { AddApplicationDialog } from './AddApplicationDialog';

const { mutateAsyncMock, addNoteMock, recommendationsMock } = vi.hoisted(() => ({
  addNoteMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  recommendationsMock: vi.fn(),
}));

vi.mock('@/features/applications/hooks/useCreateApplication', () => ({
  useCreateApplication: () => ({
    isPending: false,
    mutateAsync: mutateAsyncMock,
  }),
}));

vi.mock('@/features/applications/services/applications.service', () => ({
  applicationsService: {
    addNote: addNoteMock,
  },
}));

vi.mock('@/features/recommendations/hooks/useRecommendations', () => ({
  useRecommendations: (...args: unknown[]) => recommendationsMock(...args),
}));

function renderDialog(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AddApplicationDialog onClose={onClose} open />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('AddApplicationDialog', () => {
  beforeEach(() => {
    mutateAsyncMock.mockReset();
    addNoteMock.mockReset();
    recommendationsMock.mockReset();
    mutateAsyncMock.mockResolvedValue({ id: 'app-1' });
    addNoteMock.mockResolvedValue({ id: 'note-1' });
    recommendationsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'rec-1',
            runId: 'run-1',
            rank: 1,
            displayScore: 92,
            category: 'STRONG',
            matchType: 'PROFILE',
            createdAt: '2026-08-01T00:00:00.000Z',
            scoreResult: {
              overallScore: 0.92,
              components: {},
              matchedSkills: [],
              aliasSkills: [],
              relatedSkills: [],
              transferableSkills: [],
              missingSkills: [],
              reasons: [],
            },
            job: {
              id: '11111111-1111-4111-8111-111111111111',
              title: 'Senior Frontend Engineer',
              company: {
                slug: 'microsoft',
                name: 'Microsoft',
                logoUrl: null,
                verified: true,
              },
              location: {
                formatted: 'Bangalore, India',
                remoteType: 'REMOTE',
              },
              employmentType: 'FULL_TIME',
              salary: { minimum: null, maximum: null, currency: null },
              skills: ['React'],
              publishedAt: '2026-08-01T00:00:00.000Z',
              applyUrl: 'https://example.com/jobs/1',
            },
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      },
      isError: false,
      isPending: false,
    });
  });

  it('renders manual entry form by default', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: /add application/i })).toBeInTheDocument();
    expect(
      screen.getByText(/track a job opportunity and keep your search organized/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /manual entry/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByLabelText(/^job title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^applied date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^notes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add application$/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /external url/i })).not.toBeInTheDocument();
  });

  it('switches to job feed picker mode with dynamic match scores', async () => {
    const user = userEvent.setup();

    renderDialog();

    await user.click(screen.getByRole('tab', { name: /from job feed/i }));

    expect(screen.getByPlaceholderText(/search by title, company, or skill/i)).toBeInTheDocument();
    expect(screen.getByText(/^Microsoft$/i)).toBeInTheDocument();
    expect(screen.getByText(/92% match/i)).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /select senior frontend engineer at microsoft/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /track selected job/i })).toBeInTheDocument();
    expect(
      screen.getByText(/you can update the application status after tracking/i),
    ).toBeInTheDocument();
  });

  it('tracks a selected recommended job with PLATFORM_JOB source', async () => {
    const user = userEvent.setup();

    renderDialog();

    await user.click(screen.getByRole('tab', { name: /from job feed/i }));
    await user.click(screen.getByRole('button', { name: /track selected job/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStatus: 'PREPARING',
          jobId: '11111111-1111-4111-8111-111111111111',
          priority: 'MEDIUM',
          sourceType: 'PLATFORM_JOB',
        }),
      );
    });
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderDialog(onClose);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submits a manual application to the API', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderDialog(onClose);

    fireEvent.change(screen.getByLabelText(/^job title/i), {
      target: { value: 'Senior Full Stack Engineer' },
    });
    fireEvent.change(screen.getByLabelText(/^company name/i), {
      target: { value: 'Acme Corp' },
    });
    fireEvent.change(screen.getByLabelText(/^location/i), {
      target: { value: 'San Francisco, CA' },
    });
    fireEvent.change(screen.getByLabelText(/^job url/i), {
      target: { value: 'https://acme.com/jobs/123' },
    });

    await user.click(screen.getByRole('button', { name: /^add application$/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Acme Corp',
          currentStatus: 'PREPARING',
          jobTitle: 'Senior Full Stack Engineer',
          location: 'San Francisco, CA',
          originalJobUrl: 'https://acme.com/jobs/123',
          priority: 'MEDIUM',
          sourceType: 'MANUAL',
        }),
      );
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('creates a note when notes are provided on submit', async () => {
    const user = userEvent.setup();

    renderDialog();

    fireEvent.change(screen.getByLabelText(/^job title/i), {
      target: { value: 'Senior Full Stack Engineer' },
    });
    fireEvent.change(screen.getByLabelText(/^company name/i), {
      target: { value: 'Acme Corp' },
    });
    fireEvent.change(screen.getByLabelText(/^notes/i), {
      target: { value: 'Recruiter reached out on LinkedIn.' },
    });

    await user.click(screen.getByRole('button', { name: /^add application$/i }));

    await waitFor(() => {
      expect(addNoteMock).toHaveBeenCalledWith('app-1', {
        content: 'Recruiter reached out on LinkedIn.',
      });
    });
  });

  it('shows validation errors when submitting an empty manual form', async () => {
    const user = userEvent.setup();

    renderDialog();

    await user.click(screen.getByRole('button', { name: /^add application$/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).not.toHaveBeenCalled();
      expect(document.body.textContent).toMatch(/Job title is required/);
      expect(document.body.textContent).toMatch(/Company name is required/);
    });
  });
});
