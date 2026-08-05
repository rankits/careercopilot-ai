import { useQuery } from '@tanstack/react-query';

import { hasAuthSession } from '@/features/auth/utils/authSession';

import { userService } from '../services/user.service';

export const currentUserQueryKey = ['user', 'me'] as const;

export function useCurrentUser() {
  return useQuery({
    enabled: hasAuthSession(),
    queryFn: () => userService.getMe(),
    queryKey: currentUserQueryKey,
    staleTime: 30_000,
  });
}
