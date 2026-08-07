import type { SvgIconComponent } from '@mui/icons-material';
export type SidebarVariant = 'open' | 'collapsed' | 'compact';
export type SidebarTone = 'light' | 'dark' | 'gradient';
export type MobileSidebarMode = 'bottomNav';

export interface SidebarNavItem {
  href?: string;
  icon: SvgIconComponent;
  id: string;
  label: string;
}

export interface SidebarProps {
  activeItemId?: string;
  className?: string;
  isDownloadingLatestResume?: boolean;
  items?: SidebarNavItem[];
  latestResumeName?: string | null;
  mobileMode?: MobileSidebarMode;
  onDownloadLatestResume?: () => void;
  onItemSelect?: (item: SidebarNavItem) => void;
  onLogoutClick?: () => void;
  onOpenResumeVersions?: () => void;
  onSettingsClick?: () => void;
  onVariantChange?: (variant: SidebarVariant) => void;
  tone?: SidebarTone;
  userName?: string;
  variant?: SidebarVariant;
}
