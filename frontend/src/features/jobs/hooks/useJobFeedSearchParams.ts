import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { ListJobsParams } from '@/features/jobs/types/job.types';

const SORT_VALUES = new Set(['newest', 'salaryHighToLow', 'salaryLowToHigh']);

export type JobFeedWorkMode = 'all' | 'remote' | 'hybrid' | 'onsite' | 'full-time' | 'internship';

export interface JobFeedUrlState {
  page: number;
  limit: number;
  sortBy: NonNullable<ListJobsParams['sortBy']>;
  query: string;
  workMode: JobFeedWorkMode;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
}

const parsePositiveInt = (value: string | null, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export function useJobFeedSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo<JobFeedUrlState>(() => {
    const sortRaw = searchParams.get('sortBy') ?? 'newest';
    const sortBy = SORT_VALUES.has(sortRaw) ? (sortRaw as JobFeedUrlState['sortBy']) : 'newest';
    const workMode = (searchParams.get('workMode') as JobFeedWorkMode) || 'all';
    const minSalaryRaw = searchParams.get('minSalary');
    const maxSalaryRaw = searchParams.get('maxSalary');
    const currencyRaw = searchParams.get('currency')?.trim().toUpperCase();

    return {
      page: parsePositiveInt(searchParams.get('page'), 1),
      limit: Math.min(100, parsePositiveInt(searchParams.get('limit'), 20)),
      sortBy,
      query: searchParams.get('query') ?? '',
      workMode: ['all', 'remote', 'hybrid', 'onsite', 'full-time', 'internship'].includes(workMode)
        ? workMode
        : 'all',
      minSalary: minSalaryRaw ? Number(minSalaryRaw) : undefined,
      maxSalary: maxSalaryRaw ? Number(maxSalaryRaw) : undefined,
      currency: currencyRaw && /^[A-Z]{3}$/.test(currencyRaw) ? currencyRaw : undefined,
    };
  }, [searchParams]);

  const patch = useCallback(
    (next: Partial<JobFeedUrlState>, options?: { resetPage?: boolean }) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        const merged: JobFeedUrlState = {
          ...state,
          ...next,
          page: options?.resetPage === false ? (next.page ?? state.page) : (next.page ?? 1),
        };

        const setOrDelete = (key: string, value: string | number | undefined) => {
          if (value === undefined || value === '' || value === 'all' || value === 'newest') {
            if (key === 'sortBy' && value === 'newest') {
              params.delete(key);
              return;
            }
            if (key !== 'sortBy') params.delete(key);
            else params.delete(key);
            return;
          }
          params.set(key, String(value));
        };

        setOrDelete('page', merged.page === 1 ? undefined : merged.page);
        setOrDelete('limit', merged.limit === 20 ? undefined : merged.limit);
        setOrDelete('sortBy', merged.sortBy === 'newest' ? undefined : merged.sortBy);
        setOrDelete('query', merged.query || undefined);
        setOrDelete('workMode', merged.workMode === 'all' ? undefined : merged.workMode);
        setOrDelete('minSalary', merged.minSalary);
        setOrDelete('maxSalary', merged.maxSalary);
        setOrDelete('currency', merged.currency);
        return params;
      });
    },
    [setSearchParams, state],
  );

  const clearAll = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const listParams = useMemo<ListJobsParams>(() => {
    const params: ListJobsParams = {
      limit: state.limit,
      sortBy: state.sortBy,
      ...(state.query ? { query: state.query } : {}),
      ...(state.minSalary !== undefined && !Number.isNaN(state.minSalary)
        ? { minSalary: state.minSalary }
        : {}),
      ...(state.maxSalary !== undefined && !Number.isNaN(state.maxSalary)
        ? { maxSalary: state.maxSalary }
        : {}),
      // Explicit currency still supported via URL; salary bands omit it for multi-currency match.
      ...(state.currency ? { currency: state.currency } : {}),
    };

    if (state.workMode === 'remote') params.remoteTypes = 'REMOTE';
    if (state.workMode === 'hybrid') params.remoteTypes = 'HYBRID';
    if (state.workMode === 'onsite') params.remoteTypes = 'ONSITE';
    if (state.workMode === 'full-time') params.employmentTypes = 'FULL_TIME';
    if (state.workMode === 'internship') params.employmentTypes = 'INTERNSHIP';

    return params;
  }, [
    state.currency,
    state.limit,
    state.maxSalary,
    state.minSalary,
    state.query,
    state.sortBy,
    state.workMode,
  ]);

  return { state, listParams, patch, clearAll };
}
