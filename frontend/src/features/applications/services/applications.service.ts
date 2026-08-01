import { httpClient } from '@/services/httpClient';

export interface SavedApplicationDto {
  id: string;
  jobId: string | null;
  jobTitle: string;
  companyName: string;
  currentStatus: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const applicationsService = {
  async saveJob(jobId: string): Promise<SavedApplicationDto> {
    const response = await httpClient.post('/applications/saved-jobs', { jobId });
    if (!isRecord(response) || !isRecord(response.data) || !isRecord(response.data.data)) {
      throw new Error('Unexpected save-job response shape');
    }
    return response.data.data as SavedApplicationDto;
  },

  async unsaveJob(jobId: string): Promise<void> {
    await httpClient.delete(`/applications/saved-jobs/${jobId}`);
  },

  async listSavedJobs(): Promise<SavedApplicationDto[]> {
    const response = await httpClient.get('/applications', {
      params: { status: 'SAVED', limit: 100 },
    });
    if (!isRecord(response) || !isRecord(response.data) || !isRecord(response.data.data)) {
      throw new Error('Unexpected applications list response shape');
    }
    const payload = response.data.data;
    const items = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray((payload as { data?: unknown }).data)
        ? ((payload as { data: unknown[] }).data)
        : [];
    return items as SavedApplicationDto[];
  },
};
