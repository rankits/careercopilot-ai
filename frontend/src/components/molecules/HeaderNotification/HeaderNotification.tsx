import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';

import { notificationButtonSx } from './styles';

const NOTIFICATIONS_ARIA_LABEL = 'Notifications';

export interface HeaderNotificationProps {
  count?: number;
  onClick?: () => void;
}

export function HeaderNotification({ count = 0, onClick }: HeaderNotificationProps) {
  return (
    <IconButton aria-label={NOTIFICATIONS_ARIA_LABEL} onClick={onClick} sx={notificationButtonSx}>
      <Badge badgeContent={count} color="error">
        <NotificationsOutlinedIcon />
      </Badge>
    </IconButton>
  );
}
