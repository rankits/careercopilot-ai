import { HeaderNotification, HeaderSearch, HeaderUserMenu } from '@/components/molecules';

import penguinLogoUrl from '@/assets/logo/career-copilot-penguin.png';
import { ROUTES } from '@/constants/routes';
import { APP_HEADER_DEFAULTS, BRAND_NAME } from '@/constants/ui';

import { HeaderActions, HeaderRoot, MobileLogoLink, SearchWrap } from './styles';

export interface AppHeaderProps {
  notificationCount?: number;
  onLogoutClick?: () => void;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
  onUserMenuClick?: () => void;
  searchPlaceholder?: string;
  userAvatarUrl?: string;
  userName?: string;
  userRoleLabel?: string;
}

export function AppHeader({
  notificationCount = APP_HEADER_DEFAULTS.notificationCount,
  onLogoutClick,
  onNotificationClick,
  onSettingsClick,
  onUserMenuClick,
  searchPlaceholder,
  userAvatarUrl,
  userName = APP_HEADER_DEFAULTS.userName,
  userRoleLabel,
}: AppHeaderProps) {
  return (
    <HeaderRoot>
      <MobileLogoLink aria-label={BRAND_NAME} to={ROUTES.DASHBOARD}>
        <img alt="" src={penguinLogoUrl} />
      </MobileLogoLink>

      <SearchWrap>
        <HeaderSearch placeholder={searchPlaceholder} />
      </SearchWrap>

      <HeaderActions>
        <HeaderNotification count={notificationCount} onClick={onNotificationClick} />
        <HeaderUserMenu
          avatarUrl={userAvatarUrl}
          name={userName}
          onLogoutClick={onLogoutClick}
          onMenuClick={onUserMenuClick}
          onSettingsClick={onSettingsClick}
          roleLabel={userRoleLabel}
        />
      </HeaderActions>
    </HeaderRoot>
  );
}
