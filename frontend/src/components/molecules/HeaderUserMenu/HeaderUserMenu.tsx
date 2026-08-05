import { useState, type MouseEvent } from 'react';

import {
  CloudUploadOutlinedIcon,
  KeyboardArrowDownIcon,
  LogoutIcon,
  Menu,
  MenuItem,
  SettingsOutlinedIcon,
  Typography,
} from '@/lib/material';

import { menuItemSx, UserAvatar, UserMenuButton, UserMenuText } from './styles';

export interface HeaderUserMenuProps {
  avatarUrl?: string;
  name: string;
  onLogoutClick?: () => void;
  onMenuClick?: () => void;
  onSettingsClick?: () => void;
  onUploadResumeClick?: () => void;
  roleLabel?: string;
}

export function HeaderUserMenu({
  avatarUrl,
  name,
  onLogoutClick,
  onMenuClick,
  onSettingsClick,
  onUploadResumeClick,
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

  function handleUploadResumeClick() {
    onUploadResumeClick?.();
    handleClose();
  }

  function handleLogoutClick() {
    onLogoutClick?.();
    handleClose();
  }

  return (
    <>
      <UserMenuButton aria-label="User menu" onClick={handleOpen} type="button">
        <UserAvatar alt={name} src={avatarUrl}>
          {avatarUrl ? null : initials}
        </UserAvatar>
        <UserMenuText>
          <Typography component="span">{name}</Typography>
          <Typography component="small">{roleLabel}</Typography>
        </UserMenuText>
        <KeyboardArrowDownIcon fontSize="small" />
      </UserMenuButton>

      <Menu anchorEl={anchorElement} onClose={handleClose} open={open}>
        <MenuItem onClick={handleSettingsClick} sx={menuItemSx}>
          <SettingsOutlinedIcon fontSize="small" />
          Edit Profile
        </MenuItem>
        <MenuItem onClick={handleUploadResumeClick} sx={menuItemSx}>
          <CloudUploadOutlinedIcon fontSize="small" />
          Upload Resume
        </MenuItem>
        <MenuItem onClick={handleLogoutClick} sx={menuItemSx}>
          <LogoutIcon fontSize="small" />
          Logout
        </MenuItem>
      </Menu>
    </>
  );
}

function getInitials(name: string) {
  const [firstName = '', secondName = ''] = name.trim().split(/\s+/);

  return `${firstName.charAt(0)}${secondName.charAt(0)}`.toUpperCase() || 'U';
}
