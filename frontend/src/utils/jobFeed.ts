import type { JobCardData } from '@/components/molecules';

export interface JobFilterState {
  experience: string;
  salary: string;
  type: string;
}

export function filterJobs(jobs: JobCardData[], filters: JobFilterState) {
  return jobs.filter((job) => {
    const matchesType = filters.type === 'all' || job.tags.includes(filters.type);
    const matchesSalary = filters.salary === 'all' || job.salaryBand === filters.salary;
    const matchesExperience =
      filters.experience === 'all' || job.experienceBand === filters.experience;

    return matchesType && matchesSalary && matchesExperience;
  });
}
