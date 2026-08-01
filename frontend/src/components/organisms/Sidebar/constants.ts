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
  { href: ROUTES.DASHBOARD, icon: HomeOutlinedIcon, id: 'dashboard', label: 'Dashboard' },
  { href: ROUTES.JOB_FEED, icon: SearchOutlinedIcon, id: 'jobs-feed', label: 'Jobs Feed' },
  {
    href: ROUTES.SAVED_JOBS,
    icon: BookmarkBorderOutlinedIcon,
    id: 'saved-jobs',
    label: 'Saved Jobs',
  },
  { href: ROUTES.FOR_YOU, icon: TuneOutlinedIcon, id: 'for-you', label: 'For You' },
  {
    href: ROUTES.APPLICATIONS,
    icon: BusinessCenterOutlinedIcon,
    id: 'applications',
    label: 'Applications',
  },
];
