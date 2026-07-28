import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('renders children and handles click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Save profile</Button>);

    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables interaction and shows progress while loading', () => {
    const handleClick = vi.fn();

    render(
      <Button isLoading onClick={handleClick}>
        Saving
      </Button>,
    );

    const button = screen.getByRole('button', { name: /saving/i });

    expect(button).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('maps the secondary variant to an outlined MUI button', () => {
    render(<Button variant="secondary">Cancel</Button>);

    expect(screen.getByRole('button', { name: /cancel/i })).toHaveClass('MuiButton-outlined');
  });
});
