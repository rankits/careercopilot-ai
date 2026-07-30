import { ROUTES } from '@/constants/routes';
import {
  BookmarkBorderOutlinedIcon,
  BusinessCenterOutlinedIcon,
  HomeOutlinedIcon,
  SearchOutlinedIcon,
  TuneOutlinedIcon,
} from '@/lib/material';

import type { SidebarNavItem } from './interfaces';

export const DEFAULT_SIDEBAR_ITEMS: SidebarNavItem[] = [
  { href: ROUTES.HOME, icon: HomeOutlinedIcon, id: 'dashboard', label: 'Dashboard' },
  { href: ROUTES.JOB_FEED, icon: SearchOutlinedIcon, id: 'jobs-feed', label: 'Jobs Feed' },
  { icon: TuneOutlinedIcon, id: 'ai-match', label: 'AI Match' },
  { icon: BusinessCenterOutlinedIcon, id: 'applications', label: 'Applications' },
  { icon: BookmarkBorderOutlinedIcon, id: 'saved-jobs', label: 'Saved Jobs' },
];
