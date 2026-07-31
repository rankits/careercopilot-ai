import { useQuery } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { applicationQueryKeys } from '../queryKeys';
import { applicationsService } from '../services/applications.service';

export function useApplicationDetail(applicationId: string | null) {
  return useQuery({
    enabled: hasAuthSession() && Boolean(applicationId),
    queryFn: () => {
      if (!applicationId) {
        throw new Error('Application ID is required');
      }

      return applicationsService.getById(applicationId);
    },
    queryKey: applicationQueryKeys.detail(applicationId ?? 'unknown'),
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });
}
