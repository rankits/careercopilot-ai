import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const mutateMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('@/features/auto-apply/hooks/useResumeHandoff', () => ({
  useAbandonApplication: () => ({
    isPending: false,
    mutate: mutateMock,
  }),
}));

vi.mock('@/components/organisms/Toast/ToastContext', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

vi.mock('@/shared/analytics/trackEvent', () => ({
  trackEvent: vi.fn(),
}));

import { AbandonApplicationModal } from '../AbandonApplicationModal';

describe('AbandonApplicationModal', () => {
  it('requires a reason before confirming', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AbandonApplicationModal jobApplicationId="app-1" onClose={vi.fn()} open />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/does not withdraw your application on the employer/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abandon' })).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Not interested' }));
    expect(screen.getByRole('button', { name: 'Abandon' })).toBeEnabled();
  });

  it('submits abandon with reason and optional note', async () => {
    const user = userEvent.setup();
    mutateMock.mockImplementation((_payload, options) => {
      options?.onSuccess?.();
    });

    render(
      <MemoryRouter>
        <AbandonApplicationModal jobApplicationId="app-1" onClose={vi.fn()} open />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('radio', { name: 'Job closed' }));
    await user.type(screen.getByLabelText('Note (optional)'), 'Role was removed');
    await user.click(screen.getByRole('button', { name: 'Abandon' }));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith(
        { reasonCode: 'JOB_CLOSED', note: 'Role was removed' },
        expect.any(Object),
      );
    });
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Application withdrawn.', severity: 'success' }),
    );
  });
});
