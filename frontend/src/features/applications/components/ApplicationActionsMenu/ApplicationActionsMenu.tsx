import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useState, type MouseEvent, type ReactNode } from 'react';

import { colorTokens, fontSize, fontWeight } from '@/tokens';

export interface ApplicationActionsMenuProps {
  archived?: boolean;
  onArchive: () => void;
  onChangeStatus: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onUnarchive: () => void;
}

const menuItemSx = {
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  gap: '0.625rem',
  minHeight: '2.5rem',
};

const dangerMenuItemSx = {
  ...menuItemSx,
  color: colorTokens.actionDanger,
};

export function ApplicationActionsMenu({
  archived = false,
  onArchive,
  onChangeStatus,
  onDelete,
  onEdit,
  onUnarchive,
  children,
}: ApplicationActionsMenuProps & {
  children: (props: { onClick: (event: MouseEvent<HTMLElement>) => void }) => ReactNode;
}) {
  const [anchorElement, setAnchorElement] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorElement);

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorElement(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorElement(null);
  };

  const runAction = (action: () => void) => {
    handleClose();
    action();
  };

  return (
    <>
      {children({ onClick: handleOpen })}

      <Menu anchorEl={anchorElement} onClose={handleClose} open={open}>
        <MenuItem onClick={() => runAction(onEdit)} sx={menuItemSx}>
          <EditOutlinedIcon fontSize="small" />
          Edit application
        </MenuItem>
        <MenuItem onClick={() => runAction(onChangeStatus)} sx={menuItemSx}>
          <SwapHorizOutlinedIcon fontSize="small" />
          Change status
        </MenuItem>
        {archived ? (
          <MenuItem onClick={() => runAction(onUnarchive)} sx={menuItemSx}>
            <UnarchiveOutlinedIcon fontSize="small" />
            Restore application
          </MenuItem>
        ) : (
          <MenuItem onClick={() => runAction(onArchive)} sx={menuItemSx}>
            <ArchiveOutlinedIcon fontSize="small" />
            Archive application
          </MenuItem>
        )}
        <MenuItem onClick={() => runAction(onDelete)} sx={dangerMenuItemSx}>
          <DeleteOutlineIcon fontSize="small" />
          Delete application
        </MenuItem>
      </Menu>
    </>
  );
}
