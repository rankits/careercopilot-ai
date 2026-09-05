import type { ApplicationDto } from '../types/application.types';
import {
  archiveDisplayConfig,
  priorityDisplayConfig,
  sourceDisplayConfig,
  statusDisplayConfig,
} from '../utils/application.constants';

import {
  formatAbsoluteDate,
  formatDateTime,
  mapApiPriorityToUi,
  mapApiStatusToUi,
  mapApplicationDtoToRecord,
} from './applicationMappers';

export const APPLICATIONS_EXPORT_EMPTY_MESSAGE =
  'Nothing to export. Adjust your filters or add an application first.';

const CSV_HEADERS = [
  'Job Title',
  'Company',
  'Location',
  'Status',
  'Priority',
  'Interest',
  'Source',
  'Applied Date',
  'Last Updated',
  'Archive State',
  'Job URL',
  'Salary Min',
  'Salary Max',
  'Salary Currency',
] as const;

export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function formatSalaryValue(value: string | null): string {
  return value?.trim() ?? '';
}

function buildCsvRow(values: string[]): string {
  return values.map(escapeCsvCell).join(',');
}

export function applicationsToCsv(applications: ApplicationDto[]): string {
  const rows = applications.map((application) => {
    const record = mapApplicationDtoToRecord(application);
    const status = statusDisplayConfig[mapApiStatusToUi(application.currentStatus)];
    const priority = priorityDisplayConfig[mapApiPriorityToUi(application.priority)];
    const source = sourceDisplayConfig[record.source];
    const archiveState = record.isArchived
      ? archiveDisplayConfig.archived
      : archiveDisplayConfig.active;

    return buildCsvRow([
      record.title,
      record.company,
      record.location,
      status.label,
      priority.label,
      String(record.interest),
      source.label,
      formatAbsoluteDate(application.appliedAt ?? application.createdAt),
      formatDateTime(application.updatedAt),
      archiveState.label,
      application.originalJobUrl ?? '',
      formatSalaryValue(application.salaryMin),
      formatSalaryValue(application.salaryMax),
      application.salaryCurrency ?? '',
    ]);
  });

  return [buildCsvRow([...CSV_HEADERS]), ...rows].join('\n');
}

function sanitizeFilenamePart(value: string): string {
  return value.trim().replace(/[^\w.-]/g, '');
}

export interface ExportFilenameUser {
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export function resolveExportNameParts(user: ExportFilenameUser | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const firstName = user?.firstName?.trim();
  const lastName = user?.lastName?.trim();

  if (firstName || lastName) {
    return {
      firstName: firstName || 'User',
      lastName: lastName || '',
    };
  }

  if (user?.name?.trim()) {
    const [first = 'User', ...rest] = user.name.trim().split(/\s+/);

    return {
      firstName: first,
      lastName: rest.join(''),
    };
  }

  const emailPrefix = user?.email?.split('@')[0]?.trim();

  return {
    firstName: emailPrefix || 'User',
    lastName: '',
  };
}

export function buildApplicationsExportFilename(
  firstName: string,
  lastName: string,
  date = new Date(),
): string {
  const first = sanitizeFilenamePart(firstName).toLowerCase() || 'user';
  const last = sanitizeFilenamePart(lastName).toLowerCase();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const stamp = `${day}-${month}-${year}`;

  return last ? `${first}-${last}-applications-${stamp}.csv` : `${first}-applications-${stamp}.csv`;
}

export function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.click();
  URL.revokeObjectURL(url);
}
