import { ROUTES } from '@/constants/routes';
import {
  BusinessCenterOutlinedIcon,
  HomeOutlinedIcon,
  SearchOutlinedIcon,
  TuneOutlinedIcon,
} from '@/lib/material';

import type { SidebarNavItem } from './interfaces';

/**
 * Default app nav. Saved Jobs is omitted until JOB-FE-005 / save API ships
 * (JOB-FE-007 — hide dead nav rather than an inert bookmark entry).
 */
export const DEFAULT_SIDEBAR_ITEMS: SidebarNavItem[] = [
  { href: ROUTES.DASHBOARD, icon: HomeOutlinedIcon, id: 'dashboard', label: 'Dashboard' },
  { href: ROUTES.JOB_FEED, icon: SearchOutlinedIcon, id: 'jobs-feed', label: 'Jobs Feed' },
  { icon: TuneOutlinedIcon, id: 'ai-match', label: 'AI Match' },
  { icon: BusinessCenterOutlinedIcon, id: 'applications', label: 'Applications' },
];
