import { HeaderNotification, HeaderSearch, HeaderUserMenu } from '@/components/molecules';

import penguinLogoUrl from '@/assets/logo/career-copilot-penguin.png';

import { HeaderActions, HeaderRoot, MobileLogo, SearchWrap } from './styles';

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
  notificationCount = 3,
  onLogoutClick,
  onNotificationClick,
  onSettingsClick,
  onUserMenuClick,
  searchPlaceholder,
  userAvatarUrl,
  userName = 'User',
  userRoleLabel,
}: AppHeaderProps) {
  return (
    <HeaderRoot>
      <MobileLogo alt="Career Copilot" src={penguinLogoUrl} />

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
