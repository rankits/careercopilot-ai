import { useMutation } from '@tanstack/react-query';

import { copilotService } from '@/features/copilot/services/copilot.service';
import type { CopilotChatRequest } from '@/features/copilot/types/copilot.types';

export function useCopilotChatMutation() {
  return useMutation({
    mutationFn: (payload: CopilotChatRequest) => copilotService.chat(payload),
    mutationKey: ['copilot', 'chat'],
  });
}
