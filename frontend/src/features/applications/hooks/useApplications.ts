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
  statusFilter: string;
}

export interface ApplicationListResult {
  pagination: ApplicationPagination;
  records: ApplicationRecord[];
}

function sortRecords(records: ApplicationRecord[], sortBy: string): ApplicationRecord[] {
  if (sortBy !== 'priority') {
    return records;
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };

  return [...records].sort(
    (left, right) => priorityOrder[left.priority] - priorityOrder[right.priority],
  );
}

export function useApplications(filters: ApplicationListFilters) {
  const debouncedSearch = useDebouncedValue(filters.searchQuery.trim(), 300);
  const listParams = buildApplicationListParams(filters, {
    limit: Number(filters.pageSize),
    page: filters.currentPage,
    search: debouncedSearch || undefined,
  });

  const queryParams = {
    ...filters,
    archived: listParams.archived,
    limit: listParams.limit,
    page: listParams.page,
    search: debouncedSearch,
    sortBy: listParams.sortBy,
    status: listParams.status,
  };

  return useQuery({
    enabled: hasAuthSession(),
    queryFn: async (): Promise<ApplicationListResult> => {
      const response = await applicationsService.list(listParams);

      return {
        pagination: response.pagination,
        records: sortRecords(response.items.map(mapApplicationDtoToRecord), filters.sortBy),
      };
    },
    queryKey: applicationQueryKeys.list(queryParams),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}
