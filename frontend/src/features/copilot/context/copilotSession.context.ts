import { createContext } from 'react';

import type { CopilotMessage } from '@/features/copilot/types/copilot.types';

export interface CopilotSessionContextValue {
  addMessage: (
    message: Omit<CopilotMessage, 'id' | 'createdAt'> &
      Partial<Pick<CopilotMessage, 'id' | 'createdAt'>>,
  ) => CopilotMessage;
  clearMessages: () => void;
  hasUserMessages: boolean;
  isOpen: boolean;
  messages: CopilotMessage[];
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

export const CopilotSessionContext = createContext<CopilotSessionContextValue | null>(null);
