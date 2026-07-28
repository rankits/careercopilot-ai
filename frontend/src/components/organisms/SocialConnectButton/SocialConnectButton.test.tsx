import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SocialConnectButton } from './SocialConnectButton';

describe('SocialConnectButton', () => {
  it('renders the selected provider label', () => {
    render(<SocialConnectButton provider="google" />);

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('handles provider click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<SocialConnectButton onClick={handleClick} provider="linkedin" />);

    await user.click(screen.getByRole('button', { name: /continue with linkedin/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
