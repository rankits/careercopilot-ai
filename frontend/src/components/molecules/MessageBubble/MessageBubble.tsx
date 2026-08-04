import { MessageBubbleSurface, MessageRow, MessageText, MessageTimestamp } from './styles';

export interface MessageBubbleProps {
  isError?: boolean;
  role: 'assistant' | 'user';
  text: string;
  timestamp: string;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function MessageBubble({ isError = false, role, text, timestamp }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <MessageRow isUser={isUser}>
      <MessageBubbleSurface isError={isError} isUser={isUser}>
        <MessageText component="p">{text}</MessageText>
      </MessageBubbleSurface>
      <MessageTimestamp component="time" dateTime={timestamp}>
        {formatTimestamp(timestamp)}
      </MessageTimestamp>
    </MessageRow>
  );
}
