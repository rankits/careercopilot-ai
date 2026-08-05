import type { SvgIconComponent } from '@/lib/material';

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
  onOpenResumeVersions?: () => void;
  onVariantChange?: (variant: SidebarVariant) => void;
  tone?: SidebarTone;
  variant?: SidebarVariant;
}
