import {
  BookmarkBorderOutlinedIcon,
  BusinessCenterOutlinedIcon,
  HomeOutlinedIcon,
  SearchOutlinedIcon,
  TuneOutlinedIcon,
} from '@/lib/material';

import type { SidebarNavItem } from './interfaces';

export const DEFAULT_SIDEBAR_ITEMS: SidebarNavItem[] = [
  { icon: HomeOutlinedIcon, id: 'dashboard', label: 'Dashboard' },
  { icon: SearchOutlinedIcon, id: 'job-search', label: 'Job Search' },
  { icon: TuneOutlinedIcon, id: 'ai-match', label: 'AI Match' },
  { icon: BusinessCenterOutlinedIcon, id: 'applications', label: 'Applications' },
  { icon: BookmarkBorderOutlinedIcon, id: 'saved-jobs', label: 'Saved Jobs' },
];
