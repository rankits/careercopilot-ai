import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';
import { StatusChangeDialog } from './StatusChangeDialog';

const mutateAsyncMock = vi.fn();
let isPendingMock = false;

vi.mock('@/features/applications/hooks/useApplicationMutations', () => ({
  useTransitionApplicationStatus: () => ({
    isPending: isPendingMock,
    mutateAsync: mutateAsyncMock,
  }),
}));

describe('StatusChangeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isPendingMock = false;
    mutateAsyncMock.mockResolvedValue({});
  });

  const renderDialog = (
    props: Partial<React.ComponentProps<typeof StatusChangeDialog>> = {},
  ) => {
    const handleClose = vi.fn();
    const result = render(
      <ToastProvider>
        <StatusChangeDialog
          applicationId="app-123"
          currentStatus="APPLIED"
          onClose={handleClose}
          open={true}
          {...props}
        />
      </ToastProvider>,
    );
    return { handleClose, ...result };
  };

  it('renders the dialog with title, subtitle, status dropdown, note field, and buttons when open', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: /change status/i })).toBeInTheDocument();
    expect(
      screen.getByText(/move this application to the next stage in your pipeline/i),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /applied/i })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/add context for this status change\.\.\./i),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update status/i })).toBeInTheDocument();
  });

  it('calls onClose when clicking the close button or cancel button', async () => {
    const user = userEvent.setup();
    const { handleClose } = renderDialog();

    const closeButton = screen.getByRole('button', { name: /close status change dialog/i });
    await user.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('shows an error toast if updating without changing the status', async () => {
    const user = userEvent.setup();
    renderDialog();

    const updateButton = screen.getByRole('button', { name: /update status/i });
    await user.click(updateButton);

    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/select a different status to continue\./i),
    ).toBeInTheDocument();
  });

  it('submits a status transition with an optional note successfully', async () => {
    const user = userEvent.setup();
    const { handleClose } = renderDialog();

    const dropdownButton = screen.getByRole('button', { name: /applied/i });
    await user.click(dropdownButton);

    const interviewOption = await screen.findByRole('menuitem', { name: /^interview$/i });
    await user.click(interviewOption);

    const noteInput = screen.getByPlaceholderText(/add context for this status change\.\.\./i);
    await user.type(noteInput, 'Scheduled recruiter screening');

    const updateButton = screen.getByRole('button', { name: /update status/i });
    await user.click(updateButton);

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      note: 'Scheduled recruiter screening',
      toStatus: 'INTERVIEW',
    });
    expect(await screen.findByText(/application status updated/i)).toBeInTheDocument();
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('handles API error when transition fails', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockRejectedValueOnce(new Error('Server error transition failed'));
    renderDialog();

    const dropdownButton = screen.getByRole('button', { name: /applied/i });
    await user.click(dropdownButton);

    const rejectedOption = await screen.findByRole('menuitem', { name: /rejected/i });
    await user.click(rejectedOption);

    const updateButton = screen.getByRole('button', { name: /update status/i });
    await user.click(updateButton);

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      note: undefined,
      toStatus: 'REJECTED',
    });
    expect(await screen.findByText(/server error transition failed/i)).toBeInTheDocument();
  });

  it('disables buttons and shows updating text when transition is pending', () => {
    isPendingMock = true;
    renderDialog();

    const updateButton = screen.getByRole('button', { name: /updating\.\.\./i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });

    expect(updateButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });
});
