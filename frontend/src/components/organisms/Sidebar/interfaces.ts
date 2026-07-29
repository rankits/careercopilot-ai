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
  items?: SidebarNavItem[];
  mobileMode?: MobileSidebarMode;
  onItemSelect?: (item: SidebarNavItem) => void;
  onVariantChange?: (variant: SidebarVariant) => void;
  onUploadResume?: () => void;
  tone?: SidebarTone;
  variant?: SidebarVariant;
}
