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

  it('maps the outline variant to an outlined MUI button', () => {
    render(<Button variant="outline">Cancel</Button>);

    expect(screen.getByRole('button', { name: /cancel/i })).toHaveClass('MuiButton-outlined');
  });

  it('supports success and danger tones', () => {
    render(
      <>
        <Button tone="success">Approve</Button>
        <Button tone="danger" variant="outline">
          Reject
        </Button>
      </>,
    );

    expect(screen.getByRole('button', { name: /approve/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /reject/i })).toHaveClass('MuiButton-outlined');
  });
});
