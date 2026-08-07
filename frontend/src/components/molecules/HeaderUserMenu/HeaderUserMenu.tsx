import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useState, type MouseEvent } from 'react';

import { ROUTES } from '@/constants/routes';
import { HEADER_USER_MENU_COPY, USER_INITIALS_FALLBACK } from '@/constants/ui';
import { prefetchRoute } from '@/routes/lazyPages';

import { menuItemSx, UserAvatar, UserMenuButton, UserMenuText } from './styles';

export interface HeaderUserMenuProps {
  avatarUrl?: string;
  name: string;
  onLogoutClick?: () => void;
  onMenuClick?: () => void;
  onSettingsClick?: () => void;
  roleLabel?: string;
}

export function HeaderUserMenu({
  avatarUrl,
  name,
  onLogoutClick,
  onMenuClick,
  onSettingsClick,
  roleLabel = 'Frontend Developer',
}: HeaderUserMenuProps) {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorElement);
  const initials = getInitials(name);

  function handleOpen(event: MouseEvent<HTMLButtonElement>) {
    setAnchorElement(event.currentTarget);
    onMenuClick?.();
  }

  function handleClose() {
    setAnchorElement(null);
  }

  function handleSettingsClick() {
    onSettingsClick?.();
    handleClose();
  }

  function handleLogoutClick() {
    onLogoutClick?.();
    handleClose();
  }

  return (
    <>
      <UserMenuButton
        aria-label={HEADER_USER_MENU_COPY.ariaLabel}
        onClick={handleOpen}
        type="button"
      >
        <UserAvatar alt={name} src={avatarUrl}>
          {avatarUrl ? null : initials}
        </UserAvatar>
        <UserMenuText className="header-user-meta">
          <Typography component="span">{name}</Typography>
          <Typography component="small">{roleLabel}</Typography>
        </UserMenuText>
        <KeyboardArrowDownIcon className="header-user-chevron" fontSize="small" />
      </UserMenuButton>

      <Menu anchorEl={anchorElement} onClose={handleClose} open={open}>
        <MenuItem
          onClick={handleSettingsClick}
          onFocus={() => prefetchRoute(ROUTES.PROFILE_EDIT)}
          onMouseEnter={() => prefetchRoute(ROUTES.PROFILE_EDIT)}
          sx={menuItemSx}
        >
          <SettingsOutlinedIcon fontSize="small" />
          {HEADER_USER_MENU_COPY.editProfile}
        </MenuItem>
        <MenuItem onClick={handleLogoutClick} sx={menuItemSx}>
          <LogoutIcon fontSize="small" />
          {HEADER_USER_MENU_COPY.logout}
        </MenuItem>
      </Menu>
    </>
  );
}

function getInitials(name: string) {
  const [firstName = '', secondName = ''] = name.trim().split(/\s+/);

  return `${firstName.charAt(0)}${secondName.charAt(0)}`.toUpperCase() || USER_INITIALS_FALLBACK;
}
