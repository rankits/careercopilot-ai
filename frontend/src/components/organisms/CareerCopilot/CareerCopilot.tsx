import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { ChatInput } from '@/components/molecules/ChatInput';
import { MessageBubble } from '@/components/molecules/MessageBubble';
import { PromptChip } from '@/components/molecules/PromptChip';

import { useCopilotChatMutation } from '@/features/copilot/hooks/useCopilotChatMutation';
import { useCopilotPageContext } from '@/features/copilot/hooks/useCopilotPageContext';
import { useCopilotSession } from '@/features/copilot/hooks/useCopilotSession';

import { BRAND_NAME, CAREER_COPILOT_COPY } from '@/constants/ui';
import { COPILOT_SUGGESTED_PROMPTS } from '@/features/copilot/types/copilot.types';

import {
  ChatDialogPaperSx,
  ChatDrawerPaper,
  ChatHeader,
  ChatHeaderIcon,
  ChatHeaderMain,
  ChatHeaderSubtitle,
  ChatHeaderTitle,
  ChatMessages,
  CloseIcon,
  CopilotFab,
  Dialog,
  Drawer,
  IconButton,
  PromptChipGrid,
  RetryRow,
  SmartToyOutlinedIcon,
  TypingRow,
} from './styles';

export function CareerCopilot() {
  const isMobile = useMediaQuery('(max-width: 760px)');
  const { addMessage, hasUserMessages, isOpen, messages, setIsOpen, toggleOpen } =
    useCopilotSession();
  const { context, page } = useCopilotPageContext();
  const chatMutation = useCopilotChatMutation();

  const [draft, setDraft] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, messages, chatMutation.isPending]);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || chatMutation.isPending) return;

    setDraft('');
    setLastFailedMessage(null);
    addMessage({ role: 'user', text: message });

    try {
      const result = await chatMutation.mutateAsync({
        context,
        message,
        page,
      });
      addMessage({ role: 'assistant', text: result.reply });
    } catch (error) {
      const errorText = error instanceof Error ? error.message : CAREER_COPILOT_COPY.unavailable;
      setLastFailedMessage(message);
      addMessage({
        error: true,
        role: 'assistant',
        text: errorText,
      });
    }
  };

  const panelBody = (
    <>
      <ChatHeader>
        <ChatHeaderMain>
          <ChatHeaderIcon aria-hidden>
            <SmartToyOutlinedIcon fontSize="small" />
          </ChatHeaderIcon>
          <Box>
            <ChatHeaderTitle component="h2">{BRAND_NAME}</ChatHeaderTitle>
            <ChatHeaderSubtitle>{CAREER_COPILOT_COPY.subtitle}</ChatHeaderSubtitle>
          </Box>
        </ChatHeaderMain>
        <IconButton
          aria-label={CAREER_COPILOT_COPY.closeAria}
          onClick={() => setIsOpen(false)}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </ChatHeader>

      <ChatMessages>
        {messages.map((message) => (
          <MessageBubble
            isError={message.error}
            key={message.id}
            role={message.role}
            text={message.text}
            timestamp={message.createdAt}
          />
        ))}

        {!hasUserMessages ? (
          <PromptChipGrid aria-label={CAREER_COPILOT_COPY.suggestedPromptsAria}>
            {COPILOT_SUGGESTED_PROMPTS.map((prompt) => (
              <PromptChip
                disabled={chatMutation.isPending}
                key={prompt}
                label={prompt}
                onSelect={(label) => {
                  void sendMessage(label);
                }}
              />
            ))}
          </PromptChipGrid>
        ) : null}

        {chatMutation.isPending ? (
          <TypingRow aria-live="polite">
            <CircularProgress size={16} />
            {CAREER_COPILOT_COPY.thinking}
          </TypingRow>
        ) : null}

        {lastFailedMessage ? (
          <RetryRow>
            <Button
              onClick={() => {
                void sendMessage(lastFailedMessage);
              }}
              size="small"
              tone="primary"
              variant="outline"
            >
              {CAREER_COPILOT_COPY.retryLastMessage}
            </Button>
          </RetryRow>
        ) : null}

        <div ref={messagesEndRef} />
      </ChatMessages>

      <ChatInput
        isSending={chatMutation.isPending}
        onChange={setDraft}
        onSend={() => {
          void sendMessage(draft);
        }}
        value={draft}
      />
    </>
  );

  return (
    <>
      <CopilotFab
        aria-expanded={isOpen}
        aria-label={isOpen ? CAREER_COPILOT_COPY.closeAria : CAREER_COPILOT_COPY.openAria}
        onClick={toggleOpen}
        type="button"
      >
        <SmartToyOutlinedIcon />
      </CopilotFab>

      {isMobile ? (
        <Dialog
          fullScreen
          onClose={() => setIsOpen(false)}
          open={isOpen}
          slotProps={{
            paper: {
              sx: ChatDialogPaperSx,
            },
          }}
          TransitionProps={{ timeout: 220 }}
        >
          {panelBody}
        </Dialog>
      ) : (
        <Drawer
          anchor="right"
          onClose={() => setIsOpen(false)}
          open={isOpen}
          slotProps={{
            paper: {
              sx: {
                borderLeft: '0.0625rem solid',
                borderColor: 'divider',
                boxShadow: '0 24px 80px rgba(33, 83, 166, 0.18)',
              },
            },
          }}
          transitionDuration={220}
        >
          <ChatDrawerPaper>{panelBody}</ChatDrawerPaper>
        </Drawer>
      )}
    </>
  );
}
