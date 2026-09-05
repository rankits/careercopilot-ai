import type { FilterDropdownOption } from '@/components/molecules';

export const savedJobSortOptions: FilterDropdownOption[] = [
  { label: 'Recently saved', value: 'recent' },
  { label: 'Oldest saved', value: 'oldest' },
  { label: 'Company A–Z', value: 'company' },
  { label: 'Title A–Z', value: 'title' },
];

export const SAVED_JOBS_COPY = {
  browseJobs: 'Browse Jobs',
  ctaDescription: 'Save more jobs from the feed and access them here anytime.',
  ctaTitle: 'Keep building your dream career!',
  emptyDescription: 'Save jobs from Job Feed to access them here anytime.',
  emptyTitle: 'No Saved Jobs Yet',
  exploreJobs: 'Explore Jobs',
  headerIllustrationAlt: 'Saved jobs illustration',
  loading: 'Loading saved jobs',
  openOriginal: 'Open original listing',
  removeSaved: 'Remove from saved',
  removedToast: 'Removed from saved jobs',
  removeFailedToast: 'Unable to remove this saved job.',
  savedToast: 'Job saved successfully',
  sortPrefix: 'Sort by',
  subtitle: "Jobs you've saved for later.",
  title: 'Saved Jobs',
} as const;

export type SavedJobSort = 'recent' | 'oldest' | 'company' | 'title';
