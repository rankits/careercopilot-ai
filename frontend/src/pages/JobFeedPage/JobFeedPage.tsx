import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { FilterDropdown, JobCard, JobFilterBar, VirtualizedJobList } from '@/components/molecules';

import { useJobFeed } from '@/features/jobs/hooks/useJobFeed';
import {
  type JobFeedWorkMode,
  useJobFeedSearchParams,
} from '@/features/jobs/hooks/useJobFeedSearchParams';
import { openExternalApply } from '@/features/jobs/utils/openExternalApply';

import { jobFilters, salaryBandToApiRange, salaryOptions, sortOptions } from '@/constants/pages/jobFeed';
import { jobDetailPath } from '@/constants/routes';
import { Box, Chip, CircularProgress, Typography } from '@/lib/material';

import { jobFeedPageSx } from './styles';

function salaryStateFromUrl(min?: number, max?: number): string {
  if (max === 50_000 && min === undefined) return 'under-50k';
  if (min === 50_000 && max === 100_000) return '50-100k';
  if (min === 100_000 && max === undefined) return '100k-plus';
  return 'all';
}

function labelFor(options: { label: string; value: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function JobFeedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, listParams, patch, clearAll } = useJobFeedSearchParams();
  const [searchDraft, setSearchDraft] = useState(state.query);

  const { data, isPending, isError, error, refetch, isFetching } = useJobFeed(listParams);

  const activeFilters = jobFilters.map((filter) => ({
    ...filter,
    active: filter.id === state.workMode,
  }));
  const salaryValue = salaryStateFromUrl(state.minSalary, state.maxSalary);
  const totalItems = data?.pagination.totalItems ?? 0;
  const hasActiveFilters = Boolean(
    state.query ||
      state.workMode !== 'all' ||
      state.minSalary !== undefined ||
      state.maxSalary !== undefined ||
      state.sortBy !== 'newest',
  );

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onDelete: () => void }[] = [];
    if (state.query) {
      chips.push({
        key: 'query',
        label: `Search: ${state.query}`,
        onDelete: () => {
          setSearchDraft('');
          patch({ query: '' }, { resetPage: true });
        },
      });
    }
    if (state.workMode !== 'all') {
      chips.push({
        key: 'workMode',
        label: labelFor(
          jobFilters.map((f) => ({ label: f.label, value: f.id })),
          state.workMode,
        ),
        onDelete: () => patch({ workMode: 'all' }, { resetPage: true }),
      });
    }
    if (salaryValue !== 'all') {
      chips.push({
        key: 'salary',
        label: labelFor(salaryOptions, salaryValue),
        onDelete: () =>
          patch({ minSalary: undefined, maxSalary: undefined }, { resetPage: true }),
      });
    }
    if (state.sortBy !== 'newest') {
      chips.push({
        key: 'sortBy',
        label: labelFor(sortOptions, state.sortBy),
        onDelete: () => patch({ sortBy: 'newest' }, { resetPage: true }),
      });
    }
    return chips;
  }, [patch, salaryValue, state.query, state.sortBy, state.workMode]);

  const emptyMessage = useMemo(() => {
    if (hasActiveFilters) return 'No jobs match your filters.';
    return 'No jobs are available yet.';
  }, [hasActiveFilters]);

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
        <JobFilterBar
          filters={activeFilters}
          onFilterClick={(filter) =>
            patch({ workMode: filter.id as JobFeedWorkMode }, { resetPage: true })
          }
        />
        <Input
          aria-label="Search jobs"
          onChange={(event) => setSearchDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              patch({ query: searchDraft.trim() }, { resetPage: true });
            }
          }}
          placeholder="Search title, company..."
          size="small"
          value={searchDraft}
        />
        <FilterDropdown
          label="Salary"
          onChange={(value) => {
            const range = salaryBandToApiRange(value);
            patch(
              { minSalary: range.minSalary, maxSalary: range.maxSalary },
              { resetPage: true },
            );
          }}
          options={salaryOptions}
          value={salaryValue}
        />
        <FilterDropdown
          label="Sort"
          onChange={(value) =>
            patch(
              { sortBy: value as 'newest' | 'salaryHighToLow' | 'salaryLowToHigh' },
              { resetPage: true },
            )
          }
          options={sortOptions}
          value={state.sortBy}
        />
        {hasActiveFilters ? (
          <Button
            onClick={() => {
              setSearchDraft('');
              clearAll();
            }}
            size="small"
            variant="outline"
          >
            Clear all
          </Button>
        ) : null}
      </Box>

      {activeFilterChips.length > 0 ? (
        <Box aria-label="Active filters" sx={jobFeedPageSx.activeChips}>
          {activeFilterChips.map((chip) => (
            <Chip
              key={chip.key}
              label={chip.label}
              onDelete={chip.onDelete}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      ) : null}

      {!isPending && !isError ? (
        <Typography aria-live="polite" sx={{ px: 0.5 }}>
          {totalItems} job{totalItems === 1 ? '' : 's'} found
          {isFetching ? ' · Updating…' : ''}
        </Typography>
      ) : null}

      <Box sx={jobFeedPageSx.list}>
        {isPending ? (
          <Box
            aria-busy="true"
            aria-live="polite"
            sx={{ display: 'grid', placeItems: 'center', py: 8 }}
          >
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
          (data?.cards.length ?? 0) > 0 ? (
            <>
              <VirtualizedJobList
                ariaLabel="Job feed results"
                getKey={(job) => job.id ?? `${job.company}-${job.title}`}
                items={data?.cards ?? []}
              renderItem={(job) => (
                <JobCard
                  job={job}
                  onApply={(selected) => {
                    openExternalApply(selected.applyUrl);
                  }}
                  onOpen={(selected) => {
                    if (!selected.id) return;
                    void navigate(jobDetailPath(selected.id), {
                      state: { fromFeed: `${location.pathname}${location.search}` },
                    });
                  }}
                />
              )}
            />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 2 }}>
                <Button
                  disabled={!data?.pagination.hasPreviousPage || isFetching}
                  onClick={() => patch({ page: state.page - 1 }, { resetPage: false })}
                  size="small"
                  variant="outline"
                >
                  Previous
                </Button>
                <Typography>
                  Page {data?.pagination.page ?? state.page} of {data?.pagination.totalPages ?? 1}
                </Typography>
                <Button
                  disabled={!data?.pagination.hasNextPage || isFetching}
                  onClick={() => patch({ page: state.page + 1 }, { resetPage: false })}
                  size="small"
                  variant="outline"
                >
                  Next
                </Button>
              </Box>
            </>
          ) : (
            <Typography role="status" sx={{ py: 6 }}>
              {emptyMessage}
            </Typography>
          )
        ) : null}
      </Box>
    </Box>
  );
}
