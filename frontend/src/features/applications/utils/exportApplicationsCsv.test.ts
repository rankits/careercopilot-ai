import { describe, expect, it } from 'vitest';

import type { ApplicationDto } from '../types/application.types';

import {
  applicationsToCsv,
  buildApplicationsExportFilename,
  escapeCsvCell,
  resolveExportNameParts,
} from './exportApplicationsCsv';

const sampleApplication: ApplicationDto = {
  appliedAt: '2026-07-01T10:00:00.000Z',
  archivedAt: null,
  closedAt: null,
  companyId: null,
  companyLogoUrl: null,
  companyName: 'Acme Corp',
  createdAt: '2026-07-01T09:00:00.000Z',
  currentStatus: 'APPLIED',
  employmentType: null,
  firstResponseAt: null,
  id: 'app-1',
  interestLevel: 4,
  jobId: null,
  jobTitle: 'Senior Engineer',
  location: 'Remote',
  originalJobUrl: 'https://acme.com/jobs/1',
  primarySourceType: 'MANUAL',
  priority: 'HIGH',
  remoteType: null,
  salaryCurrency: 'USD',
  salaryMax: '180000.0000',
  salaryMin: '150000.0000',
  salaryPeriod: 'YEAR',
  updatedAt: '2026-07-02T12:00:00.000Z',
  userId: 'user-1',
};

describe('escapeCsvCell', () => {
  it('wraps values containing commas in quotes', () => {
    expect(escapeCsvCell('Acme, Corp')).toBe('"Acme, Corp"');
  });

  it('escapes embedded quotes', () => {
    expect(escapeCsvCell('Role "Lead"')).toBe('"Role ""Lead"""');
  });
});

describe('applicationsToCsv', () => {
  it('includes headers and mapped application values', () => {
    const csv = applicationsToCsv([sampleApplication]);
    const [headerRow, dataRow] = csv.split('\n');

    expect(headerRow).toContain('Job Title');
    expect(headerRow).toContain('Archive State');
    expect(dataRow).toContain('Senior Engineer');
    expect(dataRow).toContain('Acme Corp');
    expect(dataRow).toContain('APPLIED');
    expect(dataRow).toContain('Active');
    expect(dataRow).toContain('https://acme.com/jobs/1');
  });
});

describe('buildApplicationsExportFilename', () => {
  it('combines first name, last name, and today date with hyphens', () => {
    expect(
      buildApplicationsExportFilename('Pankaj', 'Saini', new Date('2026-07-31T12:00:00.000Z')),
    ).toBe('pankaj-saini-applications-31-07-2026.csv');
  });

  it('sanitizes unsafe filename characters', () => {
    expect(
      buildApplicationsExportFilename('Mary-Jane', "O'Brien", new Date('2026-07-31T12:00:00.000Z')),
    ).toBe('mary-jane-obrien-applications-31-07-2026.csv');
  });

  it('omits last name segment when absent', () => {
    expect(
      buildApplicationsExportFilename('Pankaj', '', new Date('2026-07-31T12:00:00.000Z')),
    ).toBe('pankaj-applications-31-07-2026.csv');
  });
});

describe('resolveExportNameParts', () => {
  it('prefers first and last name from the user profile', () => {
    expect(resolveExportNameParts({ firstName: 'Ada', lastName: 'Lovelace' })).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
  });

  it('falls back to the display name when needed', () => {
    expect(resolveExportNameParts({ name: 'Grace Hopper' })).toEqual({
      firstName: 'Grace',
      lastName: 'Hopper',
    });
  });
});
