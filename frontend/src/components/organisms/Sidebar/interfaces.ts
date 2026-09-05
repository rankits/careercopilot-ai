import type { SvgIconComponent } from '@mui/icons-material';
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

export interface SidebarNavSection {
  id: string;
  itemIds: readonly string[];
  label: string;
}

export interface SidebarProps {
  activeItemId?: string;
  className?: string;
  isDownloadingLatestResume?: boolean;
  items?: SidebarNavItem[];
  latestResumeName?: string | null;
  latestResumeScore?: number | null;
  latestResumeUploadedAt?: string | null;
  mobileMode?: MobileSidebarMode;
  onOpenAiAssistant?: () => void;
  onDownloadLatestResume?: () => void;
  onItemSelect?: (item: SidebarNavItem) => void;
  onLogoutClick?: () => void;
  onOpenResumeVersions?: () => void;
  onConnectedAccountsClick?: () => void;
  onSettingsClick?: () => void;
  onVariantChange?: (variant: SidebarVariant) => void;
  resumeListLoaded?: boolean;
  sections?: readonly SidebarNavSection[];
  tone?: SidebarTone;
  userName?: string;
  variant?: SidebarVariant;
}
