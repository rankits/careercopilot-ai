import { applicationStatusOptions } from '@/constants/pages/applications';
import { jobs } from '@/constants/pages/jobFeed';
import type { ApplicationPriority } from '@/features/applications/types/application.view.types';
import { colorTokens, palette } from '@/tokens';

export type AddApplicationEntryMode = 'manual' | 'job-feed' | 'external-url';

export interface JobFeedPickerJob {
  avatarColor: string;
  company: string;
  id: string;
  initials: string;
  location: string;
  match: number;
  title: string;
  type: string;
}

export const addApplicationEntryModes = [
  {
    description: 'Enter job details yourself',
    icon: 'edit' as const,
    id: 'manual' as const,
    label: 'Manual entry',
  },
  {
    description: 'Pick from recommended listings',
    icon: 'list' as const,
    id: 'job-feed' as const,
    label: 'From job feed',
  },
  {
    description: 'Import from a job posting link',
    icon: 'link' as const,
    id: 'external-url' as const,
    label: 'External URL',
  },
] as const;

/** Entry modes shown in the add-application dialog (external URL hidden for now). */
export const visibleAddApplicationEntryModes = addApplicationEntryModes.filter(
  (mode) => mode.id !== 'external-url',
);

export const MAX_APPLICATION_NOTE_LENGTH = 10_000;

const addApplicationStatusValues = new Set(['preparing', 'applied', 'screening', 'interview']);

export const addApplicationStatusOptions = applicationStatusOptions.filter((option) =>
  addApplicationStatusValues.has(option.value),
);

export const addApplicationCurrencyOptions = [
  { label: 'USD', value: 'USD' },
  { label: 'INR', value: 'INR' },
  { label: 'EUR', value: 'EUR' },
  { label: 'GBP', value: 'GBP' },
];

export const addApplicationPriorityOptions: { id: ApplicationPriority; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

export const jobFeedPickerFilters = {
  jobType: [
    { label: 'Job type', value: 'all' },
    { label: 'Full-time', value: 'full-time' },
    { label: 'Part-time', value: 'part-time' },
    { label: 'Contract', value: 'contract' },
  ],
  location: [
    { label: 'Location', value: 'all' },
    { label: 'Remote', value: 'remote' },
    { label: 'Hybrid', value: 'hybrid' },
    { label: 'On-site', value: 'on-site' },
  ],
  recommended: [
    { label: 'Recommended for you', value: 'recommended' },
    { label: 'Best match', value: 'best-match' },
    { label: 'Recently posted', value: 'recent' },
  ],
};

const pickerAvatarColors = [
  colorTokens.actionPrimary,
  palette.blue600,
  colorTokens.feedbackSuccess,
];

export const jobFeedPickerJobs: JobFeedPickerJob[] = jobs.slice(0, 3).map((job, index) => ({
  avatarColor: pickerAvatarColors[index] ?? colorTokens.actionPrimary,
  company: job.company,
  id: `${job.company}-${job.title}`.toLowerCase().replace(/\s+/g, '-'),
  initials: job.logo.toUpperCase(),
  location: job.location,
  match: job.match ?? 0,
  title: job.title,
  type: job.type,
}));

export function getTodayDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function createDefaultAddApplicationForm() {
  return {
    appliedDate: getTodayDateInputValue(),
    companyName: '',
    currency: 'USD',
    initialStatus: 'preparing',
    interest: 0,
    jobTitle: '',
    jobUrl: '',
    location: '',
    notes: '',
    priority: 'medium' as ApplicationPriority,
    salaryMax: '',
    salaryMin: '',
  };
}

export const defaultAddApplicationForm = createDefaultAddApplicationForm();
