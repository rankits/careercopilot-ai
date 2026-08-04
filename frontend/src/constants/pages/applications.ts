import {
  BusinessCenterOutlinedIcon,
  CheckCircleOutlineIcon,
  EventOutlinedIcon,
  InsightsOutlinedIcon,
} from '@/lib/material';

export type {
  ApplicationPriority,
  ApplicationRecord,
  ApplicationSource,
  ApplicationStatus,
} from '@/features/applications/types/application.view.types';

export {
  archiveDisplayConfig,
  priorityDisplayConfig,
  sourceDisplayConfig,
  statusDisplayConfig,
  statusTabDotColors,
} from '@/features/applications/utils/application.constants';

export const applicationSummaryMetrics = [
  {
    helper: 'All time',
    icon: BusinessCenterOutlinedIcon,
    key: 'total',
    label: 'Total applications',
    tone: 'primary' as const,
  },
  {
    helper: 'Not archived',
    icon: InsightsOutlinedIcon,
    key: 'active',
    label: 'Active applications',
    tone: 'success' as const,
  },
  {
    helper: 'In progress',
    icon: EventOutlinedIcon,
    key: 'interview',
    label: 'Interview stage',
    tone: 'warning' as const,
  },
  {
    helper: 'Great job! 🎉',
    icon: CheckCircleOutlineIcon,
    key: 'offer',
    label: 'Offers',
    tone: 'primary' as const,
  },
] as const;

export const applicationStatusTabs = [
  { id: 'all', label: 'All' },
  { id: 'saved', label: 'Saved' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'applied', label: 'Applied' },
  { id: 'screening', label: 'Screening' },
  { id: 'interview', label: 'Interview' },
  { id: 'assessment', label: 'Assessment' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'withdrawn', label: 'Withdrawn' },
] as const;

export const applicationStatusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Saved', value: 'saved' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Applied', value: 'applied' },
  { label: 'Screening', value: 'screening' },
  { label: 'Interview', value: 'interview' },
  { label: 'Assessment', value: 'assessment' },
  { label: 'Offer', value: 'offer' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Withdrawn', value: 'withdrawn' },
];

export const applicationSourceOptions = [
  { label: 'All sources', value: 'all' },
  { label: 'Platform Apply', value: 'platform-apply' },
  { label: 'Platform Job', value: 'platform-job' },
  { label: 'External URL', value: 'external-url' },
];

export const applicationArchiveOptions = [
  { label: 'Active only', value: 'active' },
  { label: 'Archived only', value: 'archived' },
  { label: 'All applications', value: 'all' },
];

export const applicationSortOptions = [
  { label: 'Recently updated', value: 'recently-updated' },
  { label: 'Applied date', value: 'applied-date' },
  { label: 'Company name', value: 'company' },
  { label: 'Priority', value: 'priority' },
];

export const applicationPageSizeOptions = [
  { label: '10 per page', value: '10' },
  { label: '20 per page', value: '20' },
  { label: '50 per page', value: '50' },
];
