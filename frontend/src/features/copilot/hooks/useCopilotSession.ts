import { useContext } from 'react';

import { CopilotSessionContext } from '@/features/copilot/context/copilotSession.context';

export function useCopilotSession() {
  const value = useContext(CopilotSessionContext);
  if (!value) {
    throw new Error('useCopilotSession must be used within CopilotSessionProvider');
  }
  return value;
}
