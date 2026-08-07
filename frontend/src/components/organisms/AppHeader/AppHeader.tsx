import { HeaderNotification, HeaderUserMenu } from '@/components/molecules';

import penguinLogoUrl from '@/assets/logo/career-copilot-penguin.png';
import { ROUTES } from '@/constants/routes';
import { APP_HEADER_DEFAULTS, BRAND_NAME } from '@/constants/ui';

import { HeaderActions, HeaderRoot, MobileLogoLink } from './styles';

export interface AppHeaderProps {
  notificationCount?: number;
  onConnectedAccountsClick?: () => void;
  onLogoutClick?: () => void;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
  onUserMenuClick?: () => void;
  userAvatarUrl?: string;
  userName?: string;
  userRoleLabel?: string;
}

export function AppHeader({
  notificationCount = APP_HEADER_DEFAULTS.notificationCount,
  onConnectedAccountsClick,
  onLogoutClick,
  onNotificationClick,
  onSettingsClick,
  onUserMenuClick,
  userAvatarUrl,
  userName = APP_HEADER_DEFAULTS.userName,
  userRoleLabel,
}: AppHeaderProps) {
  return (
    <HeaderRoot>
      <MobileLogoLink aria-label={BRAND_NAME} to={ROUTES.DASHBOARD}>
        <img alt="" src={penguinLogoUrl} />
      </MobileLogoLink>

      <HeaderActions>
        <HeaderNotification count={notificationCount} onClick={onNotificationClick} />
        <HeaderUserMenu
          avatarUrl={userAvatarUrl}
          name={userName}
          onConnectedAccountsClick={onConnectedAccountsClick}
          onLogoutClick={onLogoutClick}
          onMenuClick={onUserMenuClick}
          onSettingsClick={onSettingsClick}
          roleLabel={userRoleLabel}
        />
      </HeaderActions>
    </HeaderRoot>
  );
}
