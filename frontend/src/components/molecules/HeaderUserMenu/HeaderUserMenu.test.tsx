import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HeaderUserMenu } from './HeaderUserMenu';

describe('HeaderUserMenu', () => {
  it('renders name, role, and initials when avatar image is missing', () => {
    render(<HeaderUserMenu name="Dimple Malviya" />);

    expect(screen.getByRole('button', { name: /user menu/i })).toHaveTextContent('Dimple Malviya');
    expect(screen.getByText(/frontend developer/i)).toBeInTheDocument();
    expect(screen.getByText('DM')).toBeInTheDocument();
  });

  it('renders avatar image when provided', () => {
    render(<HeaderUserMenu avatarUrl="/avatar.png" name="Dimple Malviya" />);

    expect(screen.getByAltText(/dimple malviya/i)).toHaveAttribute('src', '/avatar.png');
    expect(screen.queryByText('DM')).not.toBeInTheDocument();
  });

  it('opens dropdown and calls menu action handlers', async () => {
    const user = userEvent.setup();
    const handleLogoutClick = vi.fn();
    const handleMenuClick = vi.fn();
    const handleSettingsClick = vi.fn();

    render(
      <HeaderUserMenu
        name="User"
        onLogoutClick={handleLogoutClick}
        onMenuClick={handleMenuClick}
        onSettingsClick={handleSettingsClick}
      />,
    );

    await user.click(screen.getByRole('button', { name: /user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /logout/i }));

    expect(handleMenuClick).toHaveBeenCalledTimes(2);
    expect(handleSettingsClick).toHaveBeenCalledTimes(1);
    expect(handleLogoutClick).toHaveBeenCalledTimes(1);
  });
});
