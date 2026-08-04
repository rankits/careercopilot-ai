import { ROUTES } from '@/constants/routes';
import {
  BookmarkBorderOutlinedIcon,
  BusinessCenterOutlinedIcon,
  HomeOutlinedIcon,
  SearchOutlinedIcon,
  SmartToyOutlinedIcon,
  TuneOutlinedIcon,
  DescriptionOutlinedIcon,
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
  {
    href: ROUTES.RESUME_BUILDER,
    icon: DescriptionOutlinedIcon,
    id: 'resume-builder',
    label: 'Resume Builder',
  },
  {
    href: ROUTES.SAVED_RESUMES,
    icon: BookmarkBorderOutlinedIcon,
    id: 'saved-resumes',
    label: 'Saved Resumes',
  },
  { href: ROUTES.AUTO_APPLY, icon: SmartToyOutlinedIcon, id: 'auto-apply', label: 'Auto Apply' },
  { icon: TuneOutlinedIcon, id: 'ai-match', label: 'AI Match' },
  { icon: BusinessCenterOutlinedIcon, id: 'applications', label: 'Applications' },
];
