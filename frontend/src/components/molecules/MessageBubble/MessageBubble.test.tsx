import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MessageBubble } from './MessageBubble';

describe('MessageBubble', () => {
  it('renders user message text and formatted timestamp correctly', () => {
    const timestamp = '2026-08-06T10:30:00.000Z';
    const expectedTime = new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    render(
      <MessageBubble
        role="user"
        text="Hello, how can you help me?"
        timestamp={timestamp}
      />,
    );

    expect(screen.getByText('Hello, how can you help me?')).toBeInTheDocument();

    const timeElement = screen.getByText(expectedTime);
    expect(timeElement).toBeInTheDocument();
    expect(timeElement).toHaveAttribute('dateTime', timestamp);
  });

  it('renders assistant message text correctly', () => {
    const timestamp = '2026-08-06T10:31:00.000Z';

    render(
      <MessageBubble
        role="assistant"
        text="I can assist you with your job search and resume."
        timestamp={timestamp}
      />,
    );

    expect(
      screen.getByText('I can assist you with your job search and resume.'),
    ).toBeInTheDocument();
  });

  it('handles invalid timestamp gracefully by rendering empty time string', () => {
    render(
      <MessageBubble
        role="assistant"
        text="Sample message"
        timestamp="invalid-timestamp"
      />,
    );

    expect(screen.getByText('Sample message')).toBeInTheDocument();
    const timeElement = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'time' && content === '';
    });
    expect(timeElement).toBeInTheDocument();
    expect(timeElement).toHaveAttribute('dateTime', 'invalid-timestamp');
  });

  it('renders error bubble when isError is true', () => {
    render(
      <MessageBubble
        isError
        role="assistant"
        text="Failed to generate response."
        timestamp="2026-08-06T10:32:00.000Z"
      />,
    );

    expect(screen.getByText('Failed to generate response.')).toBeInTheDocument();
  });
});
