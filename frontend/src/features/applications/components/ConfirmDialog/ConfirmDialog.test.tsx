import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders a compact delete confirmation dialog', () => {
    render(
      <ConfirmDialog
        confirmLabel="Delete"
        confirmVariant="danger"
        description="This will permanently delete the application."
        intent="delete"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        open
        title="Delete application?"
      />,
    );

    expect(screen.getByRole('heading', { name: /delete application/i })).toBeInTheDocument();
    expect(screen.getByText(/this will permanently delete the application/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        confirmLabel="Archive"
        description="This application will be archived."
        intent="archive"
        onClose={vi.fn()}
        onConfirm={onConfirm}
        open
        title="Archive application?"
      />,
    );

    await user.click(screen.getByRole('button', { name: /^archive$/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
