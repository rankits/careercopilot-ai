import { useQuery } from '@tanstack/react-query';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { applicationQueryKeys } from '../queryKeys';
import { applicationsService } from '../services/applications.service';
import type { ApplicationPagination } from '../types/application.types';
import type { ApplicationRecord } from '../types/application.view.types';
import { buildApplicationListParams } from '../utils/applicationListQuery';
import { mapApplicationDtoToRecord } from '../utils/applicationMappers';

export interface ApplicationListFilters {
  activeTab: string;
  archiveFilter: string;
  currentPage: number;
  pageSize: string;
  searchQuery: string;
  sortBy: string;
  sourceFilter: string;
  statusFilter: string;
}

export interface ApplicationListResult {
  pagination: ApplicationPagination;
  records: ApplicationRecord[];
}

export function useApplications(filters: ApplicationListFilters) {
  const normalizedSearch = filters.searchQuery.trim();
  const debouncedSearch = useDebouncedValue(normalizedSearch, 300);
  const listParams = buildApplicationListParams(filters, {
    limit: Number(filters.pageSize),
    page: filters.currentPage,
    search: debouncedSearch || undefined,
  });

  const queryParams = {
    activeTab: filters.activeTab,
    archiveFilter: filters.archiveFilter,
    archived: listParams.archived,
    currentPage: filters.currentPage,
    limit: listParams.limit,
    page: listParams.page,
    pageSize: filters.pageSize,
    search: debouncedSearch || undefined,
    sortBy: filters.sortBy,
    sourceFilter: filters.sourceFilter,
    sourceType: listParams.sourceType,
    status: listParams.status,
    statusFilter: filters.statusFilter,
  };

  return useQuery({
    enabled: hasAuthSession(),
    queryFn: async (): Promise<ApplicationListResult> => {
      const response = await applicationsService.list(listParams);

      return {
        pagination: response.pagination,
        records: response.items.map(mapApplicationDtoToRecord),
      };
    },
    queryKey: applicationQueryKeys.list(queryParams),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}
