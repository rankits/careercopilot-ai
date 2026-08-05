import { Badge, IconButton, NotificationsOutlinedIcon } from '@/lib/material';

import { notificationButtonSx } from './styles';

const NOTIFICATIONS_ARIA_LABEL = 'Notifications';

export interface HeaderNotificationProps {
  count?: number;
  onClick?: () => void;
}

export function HeaderNotification({ count = 0, onClick }: HeaderNotificationProps) {
  return (
    <IconButton
      aria-label={NOTIFICATIONS_ARIA_LABEL}
      onClick={onClick}
      sx={notificationButtonSx}
    >
      <Badge badgeContent={count} color="error">
        <NotificationsOutlinedIcon />
      </Badge>
    </IconButton>
  );
}
