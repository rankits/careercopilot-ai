import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { useToast } from './ToastContext';
import { ToastProvider } from './ToastProvider';

function TestHarness() {
  const { showToast } = useToast();

  return (
    <button onClick={() => showToast({ message: 'Saved successfully', severity: 'success' })}>
      Show toast
    </button>
  );
}

describe('ToastProvider', () => {
  it('renders a toast message when showToast is called', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: /show toast/i }));

    expect(await screen.findByText('Saved successfully')).toBeInTheDocument();
  });
});
