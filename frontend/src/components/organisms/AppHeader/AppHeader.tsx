import { HeaderUserMenu } from '@/components/molecules';

import penguinLogoUrl from '@/assets/logo/career-copilot-penguin.png';
import { ROUTES } from '@/constants/routes';
import { APP_HEADER_DEFAULTS, BRAND_NAME } from '@/constants/ui';

import { HeaderActions, HeaderRoot, MobileLogoLink } from './styles';

export interface AppHeaderProps {
  onConnectedAccountsClick?: () => void;
  onLogoutClick?: () => void;
  onSettingsClick?: () => void;
  onUserMenuClick?: () => void;
  showUserMenu?: boolean;
  userAvatarUrl?: string;
  userName?: string;
  userRoleLabel?: string;
}

export function AppHeader({
  onConnectedAccountsClick,
  onLogoutClick,
  onSettingsClick,
  onUserMenuClick,
  showUserMenu = true,
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
        <HeaderUserMenu
          avatarUrl={userAvatarUrl}
          menuEnabled={showUserMenu}
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
