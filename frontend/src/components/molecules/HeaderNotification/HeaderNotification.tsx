import { Badge, IconButton, NotificationsOutlinedIcon } from '@/lib/material';

import { notificationButtonSx } from './styles';

export interface HeaderNotificationProps {
  count?: number;
  onClick?: () => void;
}

export function HeaderNotification({ count = 0, onClick }: HeaderNotificationProps) {
  return (
    <IconButton aria-label="Notifications" onClick={onClick} sx={notificationButtonSx}>
      <Badge badgeContent={count} color="error">
        <NotificationsOutlinedIcon />
      </Badge>
    </IconButton>
  );
}
