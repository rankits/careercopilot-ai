import { useMemo, useState } from 'react';

import { FilterDropdown, JobCard, JobFilterBar, VirtualizedJobList } from '@/components/molecules';

import { experienceOptions, jobFilters, jobs, salaryOptions } from '@/constants/pages/jobFeed';
import { Box, Typography } from '@/lib/material';
import { filterJobs } from '@/utils/jobFeed';

import { jobFeedPageSx } from './styles';

export function JobFeedPage() {
  const [type, setType] = useState('all');
  const [salary, setSalary] = useState('all');
  const [experience, setExperience] = useState('all');

  const filteredJobs = useMemo(
    () => filterJobs(jobs, { experience, salary, type }),
    [experience, salary, type],
  );
  const activeFilters = jobFilters.map((filter) => ({ ...filter, active: filter.id === type }));

  return (
    <Box component="section" sx={jobFeedPageSx.root}>
      <Box sx={jobFeedPageSx.header}>
        <Typography component="h1" sx={jobFeedPageSx.title}>
          Job Feed
        </Typography>
        <Typography sx={jobFeedPageSx.subtitle}>
          Discover top job opportunities tailored for you
        </Typography>
      </Box>

      <Box sx={jobFeedPageSx.filters}>
        <JobFilterBar filters={activeFilters} onFilterClick={(filter) => setType(filter.id)} />
        <FilterDropdown
          label="Salary"
          onChange={setSalary}
          options={salaryOptions}
          value={salary}
        />
        <FilterDropdown
          label="Experience"
          onChange={setExperience}
          options={experienceOptions}
          value={experience}
        />
      </Box>

      <Box sx={jobFeedPageSx.list}>
        <VirtualizedJobList
          ariaLabel="Job feed results"
          getKey={(job) => `${job.company}-${job.title}`}
          items={filteredJobs}
          renderItem={(job) => <JobCard job={job} />}
        />
      </Box>
    </Box>
  );
}
