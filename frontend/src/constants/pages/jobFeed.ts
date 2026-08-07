import type { FilterDropdownOption, JobCardData, JobFilter } from '@/components/molecules';

/** Work-mode filters mapped to GET /jobs remoteTypes / employmentTypes. */
export const jobFilters: Omit<JobFilter, 'active'>[] = [
  { id: 'all', label: 'All Jobs' },
  { id: 'remote', label: 'Remote' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'onsite', label: 'On-site' },
  { id: 'full-time', label: 'Full Time' },
  { id: 'internship', label: 'Internship' },
];

export const salaryOptions: FilterDropdownOption[] = [
  { label: 'All Salary', value: 'all' },
  { label: 'Under $50k', value: 'under-50k' },
  { label: '$50k - $100k', value: '50-100k' },
  { label: '$100k+', value: '100k-plus' },
];

export const sortOptions: FilterDropdownOption[] = [
  { label: 'Newest', value: 'newest' },
  { label: 'Salary: High to Low', value: 'salaryHighToLow' },
  { label: 'Salary: Low to High', value: 'salaryLowToHigh' },
];

/** @deprecated Mock data retained for dashboard placeholders until Wave 3/4. */
export const experienceOptions: FilterDropdownOption[] = [
  { label: 'All Experience', value: 'all' },
];

export const jobs: JobCardData[] = [
  {
    accent: 'primary',
    company: 'Microsoft',
    experience: '5+ yrs',
    experienceBand: '5-plus',
    location: 'Bangalore, India',
    logo: 'M',
    postedAt: 'Posted 2d ago',
    salary: 'Rs 18 - 28 LPA',
    salaryBand: '25-plus',
    skills: ['React', 'TypeScript', 'Next.js', 'Azure', '+2'],
    tags: ['remote'],
    title: 'Senior Frontend Engineer',
    type: 'Remote',
  },
  {
    accent: 'danger',
    company: 'Google',
    experience: '4+ yrs',
    experienceBand: '3-4',
    location: 'Bangalore, India',
    logo: 'G',
    postedAt: 'Posted 1d ago',
    salary: 'Rs 18 - 30 LPA',
    salaryBand: '25-plus',
    skills: ['React', 'TypeScript', 'Next.js', 'GraphQL', '+1'],
    tags: ['full-time'],
    title: 'Senior Frontend Engineer',
    type: 'Full-time',
  },
  {
    accent: 'primary',
    company: 'Amazon',
    experience: '3+ yrs',
    experienceBand: '3-4',
    location: 'Bangalore, India',
    logo: 'a',
    postedAt: 'Posted 3d ago',
    salary: 'Rs 12 - 22 LPA',
    salaryBand: '15-25',
    skills: ['React', 'Node.js', 'Next.js', 'AWS', '+1'],
    tags: ['full-time'],
    title: 'Frontend Developer',
    type: 'Full-time',
  },
  {
    accent: 'danger',
    company: 'Adobe',
    experience: '2-4 yrs',
    experienceBand: '0-2',
    location: 'Noida, India',
    logo: 'A',
    postedAt: 'Posted 4d ago',
    salary: 'Rs 9 - 18 LPA',
    salaryBand: 'under-15',
    skills: ['React', 'TypeScript', 'UI/UX', 'Figma', '+1'],
    tags: ['hybrid'],
    title: 'Frontend Developer',
    type: 'Hybrid',
  },
  {
    accent: 'primary',
    company: 'Stripe',
    experience: '5+ yrs',
    experienceBand: '5-plus',
    location: 'Bengaluru, India',
    logo: 'S',
    postedAt: 'Posted 1d ago',
    salary: 'Rs 22 - 40 LPA',
    salaryBand: '25-plus',
    skills: ['React', 'Node.js', 'PostgreSQL', 'AWS', '+2'],
    tags: ['remote'],
    title: 'Full Stack Developer',
    type: 'Remote',
  },
];

export function salaryBandToApiRange(band: string): {
  minSalary: number | undefined;
  maxSalary: number | undefined;
} {
  // Bands are USD annual. Backend converts them across currencies (EUR, INR LPA, …).
  if (band === 'under-50k') return { minSalary: undefined, maxSalary: 50_000 };
  if (band === '50-100k') return { minSalary: 50_000, maxSalary: 100_000 };
  if (band === '100k-plus') return { minSalary: 100_000, maxSalary: undefined };
  return { minSalary: undefined, maxSalary: undefined };
}
