import type { ApplicationListParams, ApiApplicationStatus } from '../types/application.types';
import type { ApplicationRecord } from '../types/application.view.types';

import { mapUiArchiveToApi, mapUiSortToApi, mapUiStatusToApi } from './applicationMappers';

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
): ApiApplicationStatus | undefined {
  if (statusFilter !== 'all') {
    return mapUiStatusToApi(statusFilter as ApplicationRecord['status']);
  }

  if (activeTab !== 'all') {
    return mapUiStatusToApi(activeTab as ApplicationRecord['status']);
  }

  return undefined;
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
