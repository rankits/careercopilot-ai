import { httpClient } from '@/services/httpClient';

import type {
  ApplicationDetailDto,
  ApplicationDto,
  ApplicationListParams,
  ApplicationNoteDto,
  ApplicationTaskDto,
  BackendSuccessResponse,
  CreateApplicationPayload,
  CreateNotePayload,
  CreateTaskPayload,
  PaginatedApplicationsResponse,
  StatusTransitionPayload,
  UpdateApplicationPayload,
  UpdateTaskPayload,
} from '../types/application.types';

function buildListParams(params: ApplicationListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {};

  if (params.page !== undefined) {
    query.page = params.page;
  }

  if (params.limit !== undefined) {
    query.limit = params.limit;
  }

  if (params.search?.trim()) {
    query.search = params.search.trim();
  }

  if (params.archived) {
    query.archived = params.archived;
  }

  if (params.sortBy) {
    query.sortBy = params.sortBy;
  }

  if (params.status) {
    query.status = Array.isArray(params.status) ? params.status.join(',') : params.status;
  }

  return query;
}

function unwrapData<T>(data: BackendSuccessResponse<T>, missingMessage: string): T {
  if (!data.data) {
    throw new Error(missingMessage);
  }

  return data.data;
}

export const applicationsService = {
  async list(params: ApplicationListParams = {}): Promise<PaginatedApplicationsResponse> {
    const { data } = await httpClient.get<BackendSuccessResponse<PaginatedApplicationsResponse>>(
      '/applications',
      { params: buildListParams(params) },
    );

    return unwrapData(data, 'Missing applications data in API response');
  },

  async create(payload: CreateApplicationPayload): Promise<ApplicationDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<ApplicationDto>>(
      '/applications',
      payload,
    );

    return unwrapData(data, 'Missing application data in API response');
  },

  async getById(id: string): Promise<ApplicationDetailDto> {
    const { data } = await httpClient.get<BackendSuccessResponse<ApplicationDetailDto>>(
      `/applications/${id}`,
    );

    return unwrapData(data, 'Missing application detail in API response');
  },

  async update(id: string, payload: UpdateApplicationPayload): Promise<ApplicationDto> {
    const { data } = await httpClient.patch<BackendSuccessResponse<ApplicationDto>>(
      `/applications/${id}`,
      payload,
    );

    return unwrapData(data, 'Missing application data in API response');
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(`/applications/${id}`);
  },

  async transitionStatus(id: string, payload: StatusTransitionPayload): Promise<ApplicationDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<ApplicationDto>>(
      `/applications/${id}/status-transitions`,
      payload,
    );

    return unwrapData(data, 'Missing application data in API response');
  },

  async archive(id: string): Promise<ApplicationDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<ApplicationDto>>(
      `/applications/${id}/archive`,
    );

    return unwrapData(data, 'Missing application data in API response');
  },

  async unarchive(id: string): Promise<ApplicationDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<ApplicationDto>>(
      `/applications/${id}/unarchive`,
    );

    return unwrapData(data, 'Missing application data in API response');
  },

  async addNote(id: string, payload: CreateNotePayload): Promise<ApplicationNoteDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<ApplicationNoteDto>>(
      `/applications/${id}/notes`,
      payload,
    );

    return unwrapData(data, 'Missing note data in API response');
  },

  async deleteNote(applicationId: string, noteId: string): Promise<void> {
    await httpClient.delete(`/applications/${applicationId}/notes/${noteId}`);
  },

  async addTask(id: string, payload: CreateTaskPayload): Promise<ApplicationTaskDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<ApplicationTaskDto>>(
      `/applications/${id}/tasks`,
      payload,
    );

    return unwrapData(data, 'Missing task data in API response');
  },

  async updateTask(
    applicationId: string,
    taskId: string,
    payload: UpdateTaskPayload,
  ): Promise<ApplicationTaskDto> {
    const { data } = await httpClient.patch<BackendSuccessResponse<ApplicationTaskDto>>(
      `/applications/${applicationId}/tasks/${taskId}`,
      payload,
    );

    return unwrapData(data, 'Missing task data in API response');
  },

  async deleteTask(applicationId: string, taskId: string): Promise<void> {
    await httpClient.delete(`/applications/${applicationId}/tasks/${taskId}`);
  },

  async saveJob(jobId: string): Promise<ApplicationDto> {
    const { data } = await httpClient.post<BackendSuccessResponse<ApplicationDto>>(
      '/applications/saved-jobs',
      { jobId },
    );
    return unwrapData(data, 'Missing saved application data in API response');
  },

  async unsaveJob(jobId: string): Promise<void> {
    await httpClient.delete(`/applications/saved-jobs/${jobId}`);
  },

  async listSavedJobs(): Promise<ApplicationDto[]> {
    const result = await applicationsService.list({ status: 'SAVED', limit: 100 });
    return result.items;
  },

  async listSimilarSourceCandidates(): Promise<ApplicationDto[]> {
    const [savedJobs, appliedApplications] = await Promise.all([
      applicationsService.listSavedJobs(),
      applicationsService.list({ archived: 'false', limit: 100, sortBy: 'updatedAt:desc' }),
    ]);

    return [...savedJobs, ...appliedApplications.items];
  },
};
