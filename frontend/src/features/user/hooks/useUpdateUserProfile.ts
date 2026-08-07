import { useMutation, useQueryClient } from '@tanstack/react-query';

import { autoApplyQueryKeys } from '@/features/auto-apply/queryKeys';

import { userService, type UpdateUserProfilePayload } from '../services/user.service';

import { currentUserQueryKey } from './useCurrentUser';

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserProfilePayload) => userService.updateMe(payload),
    mutationKey: ['user', 'me', 'update'],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
      await queryClient.invalidateQueries({ queryKey: autoApplyQueryKeys.setupStatus });
    },
  });
}
