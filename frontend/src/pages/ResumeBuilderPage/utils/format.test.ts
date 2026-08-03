import { describe, expect, it } from 'vitest';

import {
  countWords,
  formatDateRange,
  formatFileSize,
  formatResumeDate,
  getResumeExtension,
  getResumeVersion,
} from './format';

describe('format utils', () => {
  it('extracts file extension', () => {
    expect(getResumeExtension('resume.PDF')).toBe('pdf');
    expect(getResumeExtension('notes.docx')).toBe('docx');
    expect(getResumeExtension('')).toBe('txt');
  });

  it('formats resume version from index', () => {
    expect(getResumeVersion(0)).toBe('1.0');
    expect(getResumeVersion(2)).toBe('3.0');
  });

  it('formats file size and date', () => {
    expect(formatFileSize(null)).toBe('');
    expect(formatFileSize(0)).toBe('');
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatResumeDate('2026-08-01T10:00:00.000Z')).toMatch(/Aug/);
  });

  it('formats date ranges and word counts', () => {
    expect(formatDateRange('', '')).toBe('');
    expect(formatDateRange('Jan 2024', 'Present')).toBe('Jan 2024 – Present');
    expect(formatDateRange('2023', '')).toBe('2023');
    expect(countWords('  hello world  ')).toBe(2);
    expect(countWords('')).toBe(0);
  });
});
