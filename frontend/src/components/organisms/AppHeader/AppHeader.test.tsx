import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppHeader } from './AppHeader';

describe('AppHeader', () => {
  it('renders search, notifications, and default user account summary', () => {
    render(<AppHeader />);

    expect(screen.getByRole('textbox', { name: /search/i })).toHaveAttribute(
      'placeholder',
      'Search jobs, companies, skills...',
    );
    expect(screen.queryByRole('button', { name: /upgrade to pro/i })).not.toBeInTheDocument();
    expect(screen.getByAltText(/career copilot/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /user menu/i })).toHaveTextContent('User');
    expect(screen.getByText('U')).toBeInTheDocument();
    expect(screen.getByText(/frontend developer/i)).toBeInTheDocument();
  });

  it('shows first and second name initials when avatar image is missing', () => {
    render(<AppHeader userName="Dimple Malviya" />);

    expect(screen.getByText('DM')).toBeInTheDocument();
  });

  it('renders custom search, role, and avatar image values', () => {
    render(
      <AppHeader
        searchPlaceholder="Search roles"
        userAvatarUrl="/avatar.png"
        userName="Alex Morgan"
        userRoleLabel="Product Engineer"
      />,
    );

    expect(screen.getByRole('textbox', { name: /search/i })).toHaveAttribute(
      'placeholder',
      'Search roles',
    );
    expect(screen.getByRole('button', { name: /user menu/i })).toHaveTextContent(
      'Product Engineer',
    );
    expect(screen.getByAltText(/alex morgan/i)).toHaveAttribute('src', '/avatar.png');
    expect(screen.queryByText('AM')).not.toBeInTheDocument();
  });

  it('opens user menu actions and calls handlers', async () => {
    const user = userEvent.setup();
    const handleLogoutClick = vi.fn();
    const handleNotificationClick = vi.fn();
    const handleSettingsClick = vi.fn();
    const handleUserMenuClick = vi.fn();

    render(
      <AppHeader
        onLogoutClick={handleLogoutClick}
        onNotificationClick={handleNotificationClick}
        onSettingsClick={handleSettingsClick}
        onUserMenuClick={handleUserMenuClick}
      />,
    );

    await user.click(screen.getByLabelText(/notifications/i));
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /logout/i }));

    expect(handleNotificationClick).toHaveBeenCalledTimes(1);
    expect(handleUserMenuClick).toHaveBeenCalledTimes(2);
    expect(handleSettingsClick).toHaveBeenCalledTimes(1);
    expect(handleLogoutClick).toHaveBeenCalledTimes(1);
  });
});
