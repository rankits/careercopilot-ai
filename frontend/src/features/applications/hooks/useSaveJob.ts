import { useMutation, useQueryClient } from '@tanstack/react-query';

import { applicationsService } from '@/features/applications/services/applications.service';

export const savedJobsQueryKey = ['applications', 'saved'] as const;

export function useSaveJob() {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (jobId: string) => applicationsService.saveJob(jobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedJobsQueryKey });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (jobId: string) => applicationsService.unsaveJob(jobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedJobsQueryKey });
    },
  });

  return {
    saveJob: saveMutation.mutateAsync,
    unsaveJob: unsaveMutation.mutateAsync,
    isSaving: saveMutation.isPending || unsaveMutation.isPending,
  };
}
