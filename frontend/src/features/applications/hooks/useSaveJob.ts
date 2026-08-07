import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useToast } from '@/components/organisms/Toast/ToastContext';

import { SAVED_JOBS_COPY } from '@/constants/pages/savedJobs';
import { applicationsService } from '@/features/applications/services/applications.service';

export const savedJobsQueryKey = ['applications', 'saved'] as const;

/** Tracks saved-job UI state locally without prefetching the saved applications list. */
export function useOptimisticSavedJobIds(baseSavedIds?: Iterable<string>) {
  const [optimisticSaved, setOptimisticSaved] = useState<Record<string, boolean>>({});

  const savedIdSet = useMemo(() => {
    const ids = new Set(baseSavedIds ?? []);

    for (const [jobId, isSaved] of Object.entries(optimisticSaved)) {
      if (isSaved) ids.add(jobId);
      else ids.delete(jobId);
    }

    return ids;
  }, [baseSavedIds, optimisticSaved]);

  return {
    savedIdSet,
    setOptimisticSaved,
  };
}

export function useSaveJob() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (jobId: string) => applicationsService.saveJob(jobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedJobsQueryKey });
      showToast({ message: SAVED_JOBS_COPY.savedToast, severity: 'success' });
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
