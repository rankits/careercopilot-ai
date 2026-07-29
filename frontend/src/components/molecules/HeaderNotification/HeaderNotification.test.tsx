import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HeaderNotification } from './HeaderNotification';

describe('HeaderNotification', () => {
  it('renders the notification count', () => {
    render(<HeaderNotification count={3} />);

    expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls click handler', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<HeaderNotification onClick={handleClick} />);

    await user.click(screen.getByLabelText(/notifications/i));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
