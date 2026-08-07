import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import {
  FilterDropdown,
  JobCard,
  JobFeedLoadingState,
  JobFeedStatus,
  JobFilterBar,
  VirtualizedJobList,
} from '@/components/molecules';

import { useSaveJob, useOptimisticSavedJobIds } from '@/features/applications/hooks/useSaveJob';
import { useJobFeed } from '@/features/jobs/hooks/useJobFeed';
import {
  type JobFeedWorkMode,
  useJobFeedSearchParams,
} from '@/features/jobs/hooks/useJobFeedSearchParams';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import {
  jobFilters,
  salaryBandToApiRange,
  salaryOptions,
  sortOptions,
} from '@/constants/pages/jobFeed';
import { jobDetailPath } from '@/constants/routes';
import type { ListJobsParams } from '@/features/jobs/types/job.types';
import { openExternalApply } from '@/features/jobs/utils/openExternalApply';
import { Box, Chip, Typography, useMediaQuery } from '@/lib/material';

import { jobFeedPageSx } from './styles';

const SEARCH_DEBOUNCE_MS = 400;
const COMPACT_FILTERS_QUERY = '(max-width: 47.5rem)';

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
  const isCompactFilters = useMediaQuery(COMPACT_FILTERS_QUERY);
  const { state, listParams, patch, clearAll } = useJobFeedSearchParams();
  const [searchDraft, setSearchDraft] = useState(state.query);
  const debouncedSearch = useDebouncedValue(searchDraft.trim(), SEARCH_DEBOUNCE_MS);
  const skipNextUrlSyncRef = useRef(false);
  const isSearchPending = searchDraft.trim() !== state.query;

  // Keep the URL shareable, but don't let our own commits overwrite in-progress typing.
  useEffect(() => {
    // Wait until the draft has settled on this value (avoids re-applying a stale query after clear).
    if (debouncedSearch !== searchDraft.trim()) return;
    if (debouncedSearch === state.query) return;
    skipNextUrlSyncRef.current = true;
    patch({ query: debouncedSearch }, { resetPage: true });
  }, [debouncedSearch, patch, searchDraft, state.query]);

  useEffect(() => {
    if (skipNextUrlSyncRef.current) {
      skipNextUrlSyncRef.current = false;
      return;
    }
    setSearchDraft(state.query);
  }, [state.query]);

  // Drive the API from the debounced draft so keystrokes never hit the network.
  const feedParams = useMemo<ListJobsParams>(() => {
    const params: ListJobsParams = { ...listParams };
    delete params.query;
    const query = searchDraft.trim() === state.query ? state.query : debouncedSearch;
    if (query) params.query = query;
    return params;
  }, [debouncedSearch, listParams, searchDraft, state.query]);

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useJobFeed(feedParams);
  const { saveJob, unsaveJob } = useSaveJob();
  const baseSavedIds = useMemo(
    () => (data?.cards ?? []).filter((job) => job.isSaved && job.id).map((job) => job.id as string),
    [data?.cards],
  );
  const { savedIdSet, setOptimisticSaved } = useOptimisticSavedJobIds(baseSavedIds);

  const activeFilters = jobFilters.map((filter) => ({
    ...filter,
    active: filter.id === state.workMode,
  }));
  const salaryValue = salaryStateFromUrl(state.minSalary, state.maxSalary);
  const totalItems = data?.totalItems ?? 0;
  const loadedCount = data?.cards.length ?? 0;
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
        onDelete: () => patch({ minSalary: undefined, maxSalary: undefined }, { resetPage: true }),
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
        <Box sx={jobFeedPageSx.search}>
          <Input
            aria-busy={isSearchPending || undefined}
            aria-label="Search jobs"
            fullWidth
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              const nextQuery = searchDraft.trim();
              setSearchDraft(nextQuery);
              if (nextQuery === state.query) return;
              skipNextUrlSyncRef.current = true;
              patch({ query: nextQuery }, { resetPage: true });
            }}
            placeholder="Search jobs, companies, or keywords..."
            size="small"
            value={searchDraft}
          />
        </Box>
        <Box sx={jobFeedPageSx.chips}>
          <JobFilterBar
            filters={activeFilters}
            onFilterClick={(filter) =>
              patch({ workMode: filter.id as JobFeedWorkMode }, { resetPage: true })
            }
          />
        </Box>
        <Box sx={jobFeedPageSx.controls}>
          <FilterDropdown
            fullWidth={isCompactFilters}
            label="Salary"
            onChange={(value) => {
              const range = salaryBandToApiRange(value);
              patch(
                {
                  minSalary: range.minSalary,
                  maxSalary: range.maxSalary,
                  // Leave currency unset so the API converts the USD band across currencies.
                  currency: undefined,
                },
                { resetPage: true },
              );
            }}
            options={salaryOptions}
            value={salaryValue}
          />
          <FilterDropdown
            fullWidth={isCompactFilters}
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
        <Box sx={jobFeedPageSx.listHeader}>
          <Typography aria-live="polite" sx={jobFeedPageSx.resultCount}>
            {totalItems} job{totalItems === 1 ? '' : 's'} found
            {loadedCount > 0 && loadedCount < totalItems ? ` · Showing ${loadedCount}` : ''}
            {isSearchPending
              ? ' · Searching…'
              : isFetchingNextPage
                ? ' · Loading more…'
                : isFetching
                  ? ' · Updating…'
                  : ''}
          </Typography>
        </Box>
      ) : null}

      <Box sx={jobFeedPageSx.list}>
        {isPending ? <JobFeedLoadingState /> : null}

        {isError ? (
          <JobFeedStatus
            message={error instanceof Error ? error.message : 'Unable to load jobs right now.'}
            onRetry={isFetching ? undefined : () => void refetch()}
            title="Unable to load jobs"
            tone="error"
          />
        ) : null}

        {!isPending && !isError ? (
          loadedCount > 0 ? (
            <VirtualizedJobList
              ariaLabel="Job feed results"
              getKey={(job) => job.id ?? `${job.company}-${job.title}`}
              isLoadingMore={isFetchingNextPage}
              items={data?.cards ?? []}
              onEndReached={() => {
                if (!hasNextPage || isFetchingNextPage) return;
                void fetchNextPage();
              }}
              renderItem={(job) => (
                <JobCard
                  job={job}
                  isSaved={Boolean(job.id && savedIdSet.has(job.id))}
                  premiumHover
                  onApply={(selected) => {
                    openExternalApply(selected.applyUrl);
                  }}
                  onOpen={(selected) => {
                    if (!selected.id) return;
                    void navigate(jobDetailPath(selected.id), {
                      state: { fromFeed: `${location.pathname}${location.search}` },
                    });
                  }}
                  onSave={(selected) => {
                    if (!selected.id) return;
                    const jobId = selected.id;
                    const wasSaved = savedIdSet.has(jobId);
                    setOptimisticSaved((prev) => ({ ...prev, [jobId]: !wasSaved }));

                    void (wasSaved ? unsaveJob(jobId) : saveJob(jobId)).catch(() => {
                      setOptimisticSaved((prev) => ({ ...prev, [jobId]: wasSaved }));
                    });
                  }}
                />
              )}
            />
          ) : (
            <JobFeedStatus
              message={
                hasActiveFilters
                  ? 'Try adjusting your filters or clearing them to see more openings.'
                  : 'Check back later for new openings.'
              }
              title={emptyMessage}
            />
          )
        ) : null}
      </Box>
    </Box>
  );
}
