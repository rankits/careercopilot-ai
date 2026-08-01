import { useMutation, useQueryClient } from '@tanstack/react-query';

import { applicationQueryKeys } from '../queryKeys';
import { applicationsService } from '../services/applications.service';
import type { CreateApplicationPayload } from '../types/application.types';
import { normalizeApplicationError } from '../utils/apiError';

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateApplicationPayload) => {
      try {
        return await applicationsService.create(payload);
      } catch (error) {
        throw normalizeApplicationError(error, 'Unable to add application.');
      }
    },
    mutationKey: ['applications', 'create'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all });
    },
  });
}
