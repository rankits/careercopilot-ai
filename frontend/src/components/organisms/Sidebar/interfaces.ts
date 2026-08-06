import type { SvgIconComponent } from '@/lib/material';

export type SidebarVariant = 'open' | 'collapsed' | 'compact';
export type SidebarTone = 'light' | 'dark' | 'gradient';
export type MobileSidebarMode = 'bottomNav';

export interface SidebarNavItem {
  href?: string;
  icon: SvgIconComponent;
  id: string;
  label: string;
  /** Compact label for the mobile bottom bar; falls back to `label`. */
  shortLabel?: string;
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
  resumeListLoaded?: boolean;
  tone?: SidebarTone;
  userName?: string;
  variant?: SidebarVariant;
}
