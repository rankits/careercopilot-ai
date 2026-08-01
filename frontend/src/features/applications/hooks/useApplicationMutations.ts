import { useMutation, useQueryClient } from '@tanstack/react-query';

import { applicationQueryKeys } from '../queryKeys';
import { applicationsService } from '../services/applications.service';
import type {
  CreateNotePayload,
  CreateTaskPayload,
  StatusTransitionPayload,
  UpdateApplicationPayload,
  UpdateTaskPayload,
} from '../types/application.types';
import { normalizeApplicationError } from '../utils/apiError';

async function invalidateApplicationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  applicationId?: string,
) {
  await queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all });

  if (applicationId) {
    await queryClient.invalidateQueries({
      queryKey: applicationQueryKeys.detail(applicationId),
    });
  }
}

export function useUpdateApplication(applicationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateApplicationPayload) => {
      try {
        return await applicationsService.update(applicationId, payload);
      } catch (error) {
        throw normalizeApplicationError(error, 'Unable to update application.');
      }
    },
    onSuccess: async () => {
      await invalidateApplicationQueries(queryClient, applicationId);
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      try {
        await applicationsService.delete(applicationId);
      } catch (error) {
        throw normalizeApplicationError(error, 'Unable to delete application.');
      }
    },
    onSuccess: async () => {
      await invalidateApplicationQueries(queryClient);
    },
  });
}

export function useTransitionApplicationStatus(applicationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: StatusTransitionPayload) => {
      try {
        return await applicationsService.transitionStatus(applicationId, payload);
      } catch (error) {
        throw normalizeApplicationError(error, 'Unable to update application status.');
      }
    },
    onSuccess: async () => {
      await invalidateApplicationQueries(queryClient, applicationId);
    },
  });
}

export function useArchiveApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      archived,
    }: {
      applicationId: string;
      archived: boolean;
    }) => {
      try {
        return archived
          ? await applicationsService.archive(applicationId)
          : await applicationsService.unarchive(applicationId);
      } catch (error) {
        throw normalizeApplicationError(
          error,
          archived ? 'Unable to archive application.' : 'Unable to restore application.',
        );
      }
    },
    onSuccess: async (_data, variables) => {
      await invalidateApplicationQueries(queryClient, variables.applicationId);
    },
  });
}

export function useAddApplicationNote(applicationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateNotePayload) => {
      try {
        return await applicationsService.addNote(applicationId, payload);
      } catch (error) {
        throw normalizeApplicationError(error, 'Unable to add note.');
      }
    },
    onSuccess: async () => {
      await invalidateApplicationQueries(queryClient, applicationId);
    },
  });
}

export function useDeleteApplicationNote(applicationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      try {
        await applicationsService.deleteNote(applicationId, noteId);
      } catch (error) {
        throw normalizeApplicationError(error, 'Unable to delete note.');
      }
    },
    onSuccess: async () => {
      await invalidateApplicationQueries(queryClient, applicationId);
    },
  });
}

export function useAddApplicationTask(applicationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      try {
        return await applicationsService.addTask(applicationId, payload);
      } catch (error) {
        throw normalizeApplicationError(error, 'Unable to add task.');
      }
    },
    onSuccess: async () => {
      await invalidateApplicationQueries(queryClient, applicationId);
    },
  });
}

export function useUpdateApplicationTask(applicationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payload, taskId }: { payload: UpdateTaskPayload; taskId: string }) => {
      try {
        return await applicationsService.updateTask(applicationId, taskId, payload);
      } catch (error) {
        throw normalizeApplicationError(error, 'Unable to update task.');
      }
    },
    onSuccess: async () => {
      await invalidateApplicationQueries(queryClient, applicationId);
    },
  });
}

export function useDeleteApplicationTask(applicationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      try {
        await applicationsService.deleteTask(applicationId, taskId);
      } catch (error) {
        throw normalizeApplicationError(error, 'Unable to delete task.');
      }
    },
    onSuccess: async () => {
      await invalidateApplicationQueries(queryClient, applicationId);
    },
  });
}
