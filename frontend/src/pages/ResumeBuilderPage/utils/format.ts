export const getResumeExtension = (fileName: string) =>
  fileName.split('.').pop()?.toLowerCase() || 'txt';

export const getResumeVersion = (index: number) => `${(index + 1).toFixed(1)}`;

export const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return '';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const formatResumeDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export function formatDateRange(startDate: string, endDate: string) {
  if (!startDate && !endDate) return '';
  if (startDate && endDate) return `${startDate} – ${endDate}`;
  return startDate || endDate;
}

export function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
