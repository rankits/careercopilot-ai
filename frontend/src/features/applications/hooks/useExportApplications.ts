import { useMutation } from '@tanstack/react-query';

import { getStoredUser } from '@/features/auth/utils/authSession';

import { normalizeApplicationError } from '../utils/apiError';
import type { ApplicationListQueryInput } from '../utils/applicationListQuery';
import { buildApplicationListParams } from '../utils/applicationListQuery';
import {
  applicationsToCsv,
  APPLICATIONS_EXPORT_EMPTY_MESSAGE,
  buildApplicationsExportFilename,
  downloadCsvFile,
  resolveExportNameParts,
} from '../utils/exportApplicationsCsv';
import { fetchAllApplications } from '../utils/fetchAllApplications';

export interface ExportApplicationsInput extends ApplicationListQueryInput {
  sourceFilter: string;
}

export function useExportApplications() {
  return useMutation({
    mutationFn: async (input: ExportApplicationsInput) => {
      try {
        const params = buildApplicationListParams(input, {
          search: input.searchQuery.trim() || undefined,
        });

        const applications = await fetchAllApplications(params);

        if (applications.length === 0) {
          throw new Error(APPLICATIONS_EXPORT_EMPTY_MESSAGE);
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
