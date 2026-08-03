import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { CopilotSessionContext } from '@/features/copilot/context/copilotSession.context';
import {
  COPILOT_WELCOME_MESSAGE,
  type CopilotMessage,
} from '@/features/copilot/types/copilot.types';

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createWelcomeMessage = (): CopilotMessage => ({
  createdAt: new Date().toISOString(),
  id: createId(),
  role: 'assistant',
  text: COPILOT_WELCOME_MESSAGE,
});

export function CopilotSessionProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>(() => [createWelcomeMessage()]);

  const addMessage = useCallback(
    (
      message: Omit<CopilotMessage, 'id' | 'createdAt'> &
        Partial<Pick<CopilotMessage, 'id' | 'createdAt'>>,
    ) => {
      const next: CopilotMessage = {
        createdAt: message.createdAt ?? new Date().toISOString(),
        error: message.error,
        id: message.id ?? createId(),
        role: message.role,
        text: message.text,
      };
      setMessages((current) => [...current, next]);
      return next;
    },
    [],
  );

  const clearMessages = useCallback(() => {
    setMessages([createWelcomeMessage()]);
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpen((current) => !current);
  }, []);

  const value = useMemo(
    () => ({
      addMessage,
      clearMessages,
      hasUserMessages: messages.some((message) => message.role === 'user'),
      isOpen,
      messages,
      setIsOpen,
      toggleOpen,
    }),
    [addMessage, clearMessages, isOpen, messages, toggleOpen],
  );

  return <CopilotSessionContext.Provider value={value}>{children}</CopilotSessionContext.Provider>;
}
