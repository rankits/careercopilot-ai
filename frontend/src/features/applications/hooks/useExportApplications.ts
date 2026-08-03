import { useMutation } from '@tanstack/react-query';

import { getStoredUser } from '@/features/auth/utils/authSession';

import type { ApplicationDto } from '../types/application.types';
import { normalizeApplicationError } from '../utils/apiError';
import type { ApplicationListQueryInput } from '../utils/applicationListQuery';
import { buildApplicationListParams } from '../utils/applicationListQuery';
import { mapApplicationDtoToRecord } from '../utils/applicationMappers';
import {
  applicationsToCsv,
  buildApplicationsExportFilename,
  downloadCsvFile,
  resolveExportNameParts,
} from '../utils/exportApplicationsCsv';
import { fetchAllApplications } from '../utils/fetchAllApplications';

export interface ExportApplicationsInput extends ApplicationListQueryInput {
  sourceFilter: string;
}

function filterApplicationsBySource(
  applications: ApplicationDto[],
  sourceFilter: string,
): ApplicationDto[] {
  if (sourceFilter === 'all') {
    return applications;
  }

  return applications.filter(
    (application) => mapApplicationDtoToRecord(application).source === sourceFilter,
  );
}

function sortApplicationsByPriority(
  applications: ApplicationDto[],
  sortBy: string,
): ApplicationDto[] {
  if (sortBy !== 'priority') {
    return applications;
  }

  const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  return [...applications].sort(
    (left, right) =>
      (priorityOrder[left.priority] ?? Number.MAX_SAFE_INTEGER) -
      (priorityOrder[right.priority] ?? Number.MAX_SAFE_INTEGER),
  );
}

export function useExportApplications() {
  return useMutation({
    mutationFn: async (input: ExportApplicationsInput) => {
      try {
        const params = buildApplicationListParams(input, {
          search: input.searchQuery.trim() || undefined,
        });

        let applications = await fetchAllApplications(params);
        applications = filterApplicationsBySource(applications, input.sourceFilter);
        applications = sortApplicationsByPriority(applications, input.sortBy);

        if (applications.length === 0) {
          throw new Error('No applications match the current filters.');
        }

        const csv = applicationsToCsv(applications);
        const { firstName, lastName } = resolveExportNameParts(getStoredUser());
        downloadCsvFile(buildApplicationsExportFilename(firstName, lastName), csv);

        return applications.length;
      } catch (error) {
        throw normalizeApplicationError(error, 'Unable to export applications.');
      }
    },
    mutationKey: ['applications', 'export'],
  });
}
