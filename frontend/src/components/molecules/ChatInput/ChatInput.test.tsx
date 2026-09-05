import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CHAT_INPUT_COPY } from '@/constants/ui';

import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  it('renders default placeholder and empty value correctly', () => {
    render(<ChatInput onChange={vi.fn()} onSend={vi.fn()} value="" />);

    const input = screen.getByPlaceholderText(CHAT_INPUT_COPY.placeholder);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('renders custom placeholder and value', () => {
    const customPlaceholder = 'Type your query here...';
    render(
      <ChatInput
        onChange={vi.fn()}
        onSend={vi.fn()}
        placeholder={customPlaceholder}
        value="Hello world"
      />,
    );

    const input = screen.getByPlaceholderText(customPlaceholder);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Hello world');
  });

  it('calls onChange handler when typing in the input field', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<ChatInput onChange={handleChange} onSend={vi.fn()} value="" />);

    const input = screen.getByPlaceholderText(CHAT_INPUT_COPY.placeholder);
    await user.type(input, 'Hello');

    expect(handleChange).toHaveBeenCalled();
  });

  it('disables the send button when the input is empty or only whitespace', () => {
    const { rerender } = render(<ChatInput onChange={vi.fn()} onSend={vi.fn()} value="" />);

    const sendButton = screen.getByRole('button', { name: CHAT_INPUT_COPY.sendAriaLabel });
    expect(sendButton).toBeDisabled();

    rerender(<ChatInput onChange={vi.fn()} onSend={vi.fn()} value="   " />);
    expect(sendButton).toBeDisabled();
  });

  it('enables the send button and calls onSend when clicked with valid text', async () => {
    const user = userEvent.setup();
    const handleSend = vi.fn();

    render(
      <ChatInput onChange={vi.fn()} onSend={handleSend} value="How can I improve my resume?" />,
    );

    const sendButton = screen.getByRole('button', { name: CHAT_INPUT_COPY.sendAriaLabel });
    expect(sendButton).not.toBeDisabled();

    await user.click(sendButton);
    expect(handleSend).toHaveBeenCalledTimes(1);
  });

  it('triggers onSend when pressing Enter without Shift', async () => {
    const user = userEvent.setup();
    const handleSend = vi.fn();

    render(<ChatInput onChange={vi.fn()} onSend={handleSend} value="Tell me about tech jobs" />);

    const input = screen.getByPlaceholderText(CHAT_INPUT_COPY.placeholder);
    await user.type(input, '{Enter}');

    expect(handleSend).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onSend when pressing Shift + Enter', async () => {
    const user = userEvent.setup();
    const handleSend = vi.fn();

    render(<ChatInput onChange={vi.fn()} onSend={handleSend} value="Line 1" />);

    const input = screen.getByPlaceholderText(CHAT_INPUT_COPY.placeholder);
    await user.type(input, '{Shift>}{Enter}{/Shift}');

    expect(handleSend).not.toHaveBeenCalled();
  });

  it('does not trigger onSend when pressing Enter on empty or whitespace input', async () => {
    const user = userEvent.setup();
    const handleSend = vi.fn();

    render(<ChatInput onChange={vi.fn()} onSend={handleSend} value="   " />);

    const input = screen.getByPlaceholderText(CHAT_INPUT_COPY.placeholder);
    await user.type(input, '{Enter}');

    expect(handleSend).not.toHaveBeenCalled();
  });

  it('disables input field and send button when disabled is true', () => {
    render(<ChatInput disabled onChange={vi.fn()} onSend={vi.fn()} value="Some text" />);

    const input = screen.getByPlaceholderText(CHAT_INPUT_COPY.placeholder);
    const sendButton = screen.getByRole('button', { name: CHAT_INPUT_COPY.sendAriaLabel });

    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('disables input field, send button, and displays CircularProgress when isSending is true', () => {
    render(<ChatInput isSending onChange={vi.fn()} onSend={vi.fn()} value="Sending query..." />);

    const input = screen.getByPlaceholderText(CHAT_INPUT_COPY.placeholder);
    const sendButton = screen.getByRole('button', { name: CHAT_INPUT_COPY.sendAriaLabel });
    const progressSpinner = screen.getByRole('progressbar');

    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
    expect(progressSpinner).toBeInTheDocument();
  });
});
