import {
  AccessTimeOutlinedIcon,
  BusinessCenterOutlinedIcon,
  CheckCircleOutlineIcon,
} from '@/lib/material';

export const dashboardMetrics = [
  {
    helper: 'up 12% this week',
    icon: BusinessCenterOutlinedIcon,
    label: 'Applications',
    tone: 'primary' as const,
    value: '152',
  },
  {
    helper: 'up 2% this week',
    icon: AccessTimeOutlinedIcon,
    label: 'Interviews',
    tone: 'success' as const,
    value: '8',
  },
  {
    helper: 'Congrats!',
    icon: CheckCircleOutlineIcon,
    label: 'Offers',
    tone: 'warning' as const,
    value: '2',
  },
] as const;

export const dashboardFilterOptions = {
  experience: [
    { label: 'Experience', value: 'all' },
    { label: '0 - 2 yrs', value: '0-2' },
    { label: '3 - 4 yrs', value: '3-4' },
  ],
  location: [
    { label: 'Location', value: 'all' },
    { label: 'Bangalore', value: 'bangalore' },
    { label: 'Hyderabad', value: 'hyderabad' },
  ],
  salary: [
    { label: 'Salary', value: 'all' },
    { label: 'Under 15 LPA', value: 'under-15' },
    { label: '15 - 25 LPA', value: '15-25' },
  ],
  sort: [
    { label: 'Sort by: Best Match', value: 'best-match' },
    { label: 'Newest', value: 'newest' },
    { label: 'Salary', value: 'salary' },
  ],
  workMode: [
    { label: 'Work Mode', value: 'all' },
    { label: 'Remote', value: 'remote' },
    { label: 'Hybrid', value: 'hybrid' },
  ],
};

export const dashboardFilters = [
  {
    key: 'location',
    label: 'Location',
    value: 'all',
  },
  {
    key: 'experience',
    label: 'Experience',
    value: 'all',
  },
  {
    key: 'salary',
    label: 'Salary',
    value: 'all',
  },
  {
    key: 'workMode',
    label: 'Work Mode',
    value: 'all',
  },
  {
    key: 'sort',
    label: 'Sort by: Best Match',
    value: 'best-match',
  },
] as const;
