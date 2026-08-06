import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SocialConnectButton } from './SocialConnectButton';

describe('SocialConnectButton', () => {
  it('renders the selected provider label', () => {
    render(<SocialConnectButton provider="google" />);

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByTestId('GoogleBrandIcon')).toHaveProperty('tagName', 'IMG');
    expect(screen.getByTestId('GoogleBrandIcon').getAttribute('src')).toMatch(
      /^(data:image\/svg\+xml|\/src\/assets\/icons\/google-brand\.svg)/,
    );
    expect(screen.queryByTestId('GoogleIcon')).not.toBeInTheDocument();
  });

  it('handles provider click events when enabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<SocialConnectButton onClick={handleClick} provider="linkedin" />);

    await user.click(screen.getByRole('button', { name: /continue with linkedin/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows a Coming Soon badge when disabled', () => {
    const handleClick = vi.fn();

    render(<SocialConnectButton comingSoon onClick={handleClick} provider="google" />);

    const button = screen.getByRole('button', { name: /continue with google/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });
});
