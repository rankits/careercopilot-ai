import type { ApplicationListParams, ApiApplicationStatus } from '../types/application.types';

import {
  mapUiArchiveToApi,
  mapUiSortToApi,
  mapUiSourceToApi,
  mapUiStatusTabToApiStatuses,
} from './applicationMappers';

/** Pipeline statuses shown in Application Management (excludes bookmark-only SAVED). */
export const APPLICATION_MANAGEMENT_STATUSES: ApiApplicationStatus[] = [
  'PREPARING',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'ASSESSMENT',
  'OFFER',
  'ACCEPTED',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
  'GHOSTED',
  'EXPIRED',
];

export interface ApplicationListQueryInput {
  activeTab: string;
  archiveFilter: string;
  searchQuery: string;
  sortBy: string;
  sourceFilter?: string;
  statusFilter: string;
}

export function resolveApplicationStatusFilter(
  activeTab: string,
  statusFilter: string,
): ApiApplicationStatus | ApiApplicationStatus[] | undefined {
  if (statusFilter !== 'all') {
    return mapUiStatusTabToApiStatuses(statusFilter);
  }

  if (activeTab !== 'all') {
    return mapUiStatusTabToApiStatuses(activeTab);
  }

  // Default "All" on Applications excludes SAVED bookmarks (those belong on Saved Jobs).
  return APPLICATION_MANAGEMENT_STATUSES;
}

export function buildApplicationListParams(
  input: ApplicationListQueryInput,
  options: { limit?: number; page?: number; search?: string } = {},
): ApplicationListParams {
  const sourceType = mapUiSourceToApi(input.sourceFilter ?? 'all');

  return {
    archived: mapUiArchiveToApi(input.archiveFilter),
    limit: options.limit,
    page: options.page,
    search: options.search,
    sortBy: mapUiSortToApi(input.sortBy) ?? 'updatedAt:desc',
    ...(sourceType ? { sourceType } : {}),
    status: resolveApplicationStatusFilter(input.activeTab, input.statusFilter),
  };
}
