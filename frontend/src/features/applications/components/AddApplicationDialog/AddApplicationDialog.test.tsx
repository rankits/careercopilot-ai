import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { AddApplicationDialog } from './AddApplicationDialog';

const mutateAsyncMock = vi.fn();

vi.mock('@/features/applications/hooks/useCreateApplication', () => ({
  useCreateApplication: () => ({
    isPending: false,
    mutateAsync: mutateAsyncMock,
  }),
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
    mutateAsyncMock.mockResolvedValue({ id: 'app-1' });
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
    expect(screen.getByRole('button', { name: /^add application$/i })).toBeInTheDocument();
  });

  it('switches to external url entry mode', async () => {
    const user = userEvent.setup();

    renderDialog();

    await user.click(screen.getByRole('tab', { name: /external url/i }));

    expect(screen.getByLabelText(/^job url/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fetch job details/i })).toBeInTheDocument();
    expect(
      screen.getByText(/we'll use this url to prefill the job details when available/i),
    ).toBeInTheDocument();
  });

  it('switches to job feed picker mode', async () => {
    const user = userEvent.setup();

    renderDialog();

    await user.click(screen.getByRole('tab', { name: /from job feed/i }));

    expect(screen.getByPlaceholderText(/search by title, company, or skill/i)).toBeInTheDocument();
    expect(screen.getByText(/^Microsoft$/i)).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /select senior frontend engineer at microsoft/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /track selected job/i })).toBeInTheDocument();
    expect(
      screen.getByText(/you can update the application status after tracking/i),
    ).toBeInTheDocument();
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
          currentStatus: 'SAVED',
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
