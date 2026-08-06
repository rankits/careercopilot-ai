import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { useCopilotSession } from '../hooks/useCopilotSession';
import { COPILOT_WELCOME_MESSAGE } from '../types/copilot.types';
import { CopilotSessionProvider } from './CopilotSessionProvider';

function TestConsumer() {
  const {
    addMessage,
    clearMessages,
    hasUserMessages,
    isOpen,
    messages,
    setIsOpen,
    toggleOpen,
  } = useCopilotSession();

  return (
    <div>
      <div data-testid="is-open">{isOpen ? 'Open' : 'Closed'}</div>
      <div data-testid="has-user-messages">{hasUserMessages ? 'Yes' : 'No'}</div>
      <ul data-testid="messages-list">
        {messages.map((msg) => (
          <li key={msg.id} data-role={msg.role}>
            {msg.text}
          </li>
        ))}
      </ul>
      <button onClick={() => toggleOpen()} type="button">
        Toggle Open
      </button>
      <button onClick={() => setIsOpen(true)} type="button">
        Set Open True
      </button>
      <button
        onClick={() => addMessage({ role: 'user', text: 'How do I optimize my resume?' })}
        type="button"
      >
        Add User Message
      </button>
      <button
        onClick={() =>
          addMessage({
            createdAt: '2026-08-06T12:00:00.000Z',
            error: true,
            id: 'custom-id-123',
            role: 'assistant',
            text: 'An error occurred.',
          })
        }
        type="button"
      >
        Add Assistant Error Message
      </button>
      <button onClick={() => clearMessages()} type="button">
        Clear Messages
      </button>
    </div>
  );
}

describe('CopilotSessionProvider', () => {
  it('provides initial session state with welcome message and closed panel', () => {
    render(
      <CopilotSessionProvider>
        <TestConsumer />
      </CopilotSessionProvider>,
    );

    expect(screen.getByTestId('is-open')).toHaveTextContent('Closed');
    expect(screen.getByTestId('has-user-messages')).toHaveTextContent('No');

    const messages = screen.getAllByRole('listitem');
    expect(messages).toHaveLength(1);
    expect(messages[0]).toHaveTextContent(COPILOT_WELCOME_MESSAGE);
    expect(messages[0]).toHaveAttribute('data-role', 'assistant');
  });

  it('toggles open state using toggleOpen and setIsOpen', async () => {
    const user = userEvent.setup();

    render(
      <CopilotSessionProvider>
        <TestConsumer />
      </CopilotSessionProvider>,
    );

    const toggleButton = screen.getByRole('button', { name: 'Toggle Open' });
    const setOpenButton = screen.getByRole('button', { name: 'Set Open True' });

    // Click toggle open -> Open
    await user.click(toggleButton);
    expect(screen.getByTestId('is-open')).toHaveTextContent('Open');

    // Click toggle open -> Closed
    await user.click(toggleButton);
    expect(screen.getByTestId('is-open')).toHaveTextContent('Closed');

    // Click set open true -> Open
    await user.click(setOpenButton);
    expect(screen.getByTestId('is-open')).toHaveTextContent('Open');
  });

  it('adds user message and updates hasUserMessages flag', async () => {
    const user = userEvent.setup();

    render(
      <CopilotSessionProvider>
        <TestConsumer />
      </CopilotSessionProvider>,
    );

    const addUserMsgBtn = screen.getByRole('button', { name: 'Add User Message' });
    await user.click(addUserMsgBtn);

    expect(screen.getByTestId('has-user-messages')).toHaveTextContent('Yes');

    const messages = screen.getAllByRole('listitem');
    expect(messages).toHaveLength(2);
    expect(messages[1]).toHaveTextContent('How do I optimize my resume?');
    expect(messages[1]).toHaveAttribute('data-role', 'user');
  });

  it('adds message with custom id, createdAt, and error flag', async () => {
    const user = userEvent.setup();

    render(
      <CopilotSessionProvider>
        <TestConsumer />
      </CopilotSessionProvider>,
    );

    const addErrorMsgBtn = screen.getByRole('button', { name: 'Add Assistant Error Message' });
    await user.click(addErrorMsgBtn);

    const messages = screen.getAllByRole('listitem');
    expect(messages).toHaveLength(2);
    expect(messages[1]).toHaveTextContent('An error occurred.');
    expect(messages[1]).toHaveAttribute('data-role', 'assistant');
  });

  it('clears added messages and resets to welcome message', async () => {
    const user = userEvent.setup();

    render(
      <CopilotSessionProvider>
        <TestConsumer />
      </CopilotSessionProvider>,
    );

    const addUserMsgBtn = screen.getByRole('button', { name: 'Add User Message' });
    const clearBtn = screen.getByRole('button', { name: 'Clear Messages' });

    await user.click(addUserMsgBtn);
    expect(screen.getByTestId('has-user-messages')).toHaveTextContent('Yes');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    await user.click(clearBtn);
    expect(screen.getByTestId('has-user-messages')).toHaveTextContent('No');

    const messages = screen.getAllByRole('listitem');
    expect(messages).toHaveLength(1);
    expect(messages[0]).toHaveTextContent(COPILOT_WELCOME_MESSAGE);
  });
});
