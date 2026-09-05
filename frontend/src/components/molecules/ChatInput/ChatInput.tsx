import CircularProgress from '@mui/material/CircularProgress';
import type { KeyboardEvent } from 'react';

import { CHAT_INPUT_COPY } from '@/constants/ui';

import { ChatInputRoot, ChatTextField, SendButton, SendIcon } from './styles';

export interface ChatInputProps {
  disabled?: boolean;
  isSending?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  value: string;
}

export function ChatInput({
  disabled = false,
  isSending = false,
  onChange,
  onSend,
  placeholder = CHAT_INPUT_COPY.placeholder,
  value,
}: ChatInputProps) {
  const canSend = value.trim().length > 0 && !disabled && !isSending;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <ChatInputRoot>
      <ChatTextField
        disabled={disabled || isSending}
        fullWidth
        maxRows={5}
        minRows={1}
        multiline
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        value={value}
        variant="outlined"
      />
      <SendButton
        aria-label={CHAT_INPUT_COPY.sendAriaLabel}
        disabled={!canSend}
        onClick={() => {
          if (canSend) onSend();
        }}
      >
        {isSending ? <CircularProgress color="inherit" size={18} /> : <SendIcon fontSize="small" />}
      </SendButton>
    </ChatInputRoot>
  );
}
