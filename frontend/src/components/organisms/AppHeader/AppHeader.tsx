import { HeaderNotification, HeaderSearch, HeaderUserMenu } from '@/components/molecules';

import penguinLogoUrl from '@/assets/logo/career-copilot-penguin.png';
import { APP_HEADER_DEFAULTS, BRAND_NAME } from '@/constants/ui';

import { HeaderActions, HeaderRoot, MobileLogo, SearchWrap } from './styles';

export interface AppHeaderProps {
  notificationCount?: number;
  onConnectedAccountsClick?: () => void;
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
  onConnectedAccountsClick,
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
      <MobileLogo alt={BRAND_NAME} src={penguinLogoUrl} />

      <SearchWrap>
        <HeaderSearch placeholder={searchPlaceholder} />
      </SearchWrap>

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
