import type { ApplicationListParams, ApiApplicationStatus } from '../types/application.types';
import type { ApplicationRecord } from '../types/application.view.types';

import { mapUiArchiveToApi, mapUiSortToApi, mapUiStatusToApi } from './applicationMappers';

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
  statusFilter: string;
}

export function resolveApplicationStatusFilter(
  activeTab: string,
  statusFilter: string,
): ApiApplicationStatus | ApiApplicationStatus[] | undefined {
  if (statusFilter !== 'all') {
    return mapUiStatusToApi(statusFilter as ApplicationRecord['status']);
  }

  if (activeTab !== 'all') {
    return mapUiStatusToApi(activeTab as ApplicationRecord['status']);
  }

  // Default "All" on Applications excludes SAVED bookmarks (those belong on Saved Jobs).
  return APPLICATION_MANAGEMENT_STATUSES;
}

export function buildApplicationListParams(
  input: ApplicationListQueryInput,
  options: { limit?: number; page?: number; search?: string } = {},
): ApplicationListParams {
  return {
    archived: mapUiArchiveToApi(input.archiveFilter),
    limit: options.limit,
    page: options.page,
    search: options.search,
    sortBy: mapUiSortToApi(input.sortBy) ?? 'updatedAt:desc',
    status: resolveApplicationStatusFilter(input.activeTab, input.statusFilter),
  };
}
