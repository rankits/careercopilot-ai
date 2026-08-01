import { useMemo, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { FilterDropdown, JobCard, JobFilterBar, VirtualizedJobList } from '@/components/molecules';

import { useJobFeed } from '@/features/jobs/hooks/useJobFeed';

import { experienceOptions, jobFilters, salaryOptions } from '@/constants/pages/jobFeed';
import { Box, CircularProgress, Typography } from '@/lib/material';
import { filterJobs } from '@/utils/jobFeed';

import { jobFeedPageSx } from './styles';

export function JobFeedPage() {
  const [type, setType] = useState('all');
  const [salary, setSalary] = useState('all');
  const [experience, setExperience] = useState('all');

  const { data, isPending, isError, error, refetch, isFetching } = useJobFeed({
    page: 1,
    limit: 50,
    sortBy: 'newest',
  });

  const filteredJobs = useMemo(
    () => filterJobs(data?.cards ?? [], { experience, salary, type }),
    [data?.cards, experience, salary, type],
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
        {isPending ? (
          <Box aria-busy="true" aria-live="polite" sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress aria-label="Loading jobs" />
          </Box>
        ) : null}

        {isError ? (
          <Box role="alert" sx={{ display: 'grid', gap: 2, justifyItems: 'start', py: 6 }}>
            <Typography>
              {error instanceof Error ? error.message : 'Unable to load jobs right now.'}
            </Typography>
            <Button disabled={isFetching} onClick={() => void refetch()} size="small">
              Retry
            </Button>
          </Box>
        ) : null}

        {!isPending && !isError ? (
          filteredJobs.length > 0 ? (
            <VirtualizedJobList
              ariaLabel="Job feed results"
              getKey={(job) => job.id ?? `${job.company}-${job.title}`}
              items={filteredJobs}
              renderItem={(job) => <JobCard job={job} />}
            />
          ) : (
            <Typography sx={{ py: 6 }}>No jobs match your filters.</Typography>
          )
        ) : null}
      </Box>
    </Box>
  );
}
