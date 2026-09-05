import useMediaQuery from '@mui/material/useMediaQuery';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCopilotChatMutation } from '@/features/copilot/hooks/useCopilotChatMutation';
import { useCopilotPageContext } from '@/features/copilot/hooks/useCopilotPageContext';
import { useCopilotSession } from '@/features/copilot/hooks/useCopilotSession';

import { BRAND_NAME, CAREER_COPILOT_COPY, CHAT_INPUT_COPY } from '@/constants/ui';
import { COPILOT_SUGGESTED_PROMPTS } from '@/features/copilot/types/copilot.types';

import { CareerCopilot } from './CareerCopilot';

// Mock dependencies
vi.mock('@/features/copilot/hooks/useCopilotSession');
vi.mock('@/features/copilot/hooks/useCopilotPageContext');
vi.mock('@/features/copilot/hooks/useCopilotChatMutation');
vi.mock('@mui/material/useMediaQuery', () => ({
  default: vi.fn(),
}));

describe('CareerCopilot', () => {
  const mockAddMessage = vi.fn();
  const mockSetIsOpen = vi.fn();
  const mockToggleOpen = vi.fn();
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMediaQuery).mockReturnValue(false); // Desktop mode by default

    vi.mocked(useCopilotSession).mockReturnValue({
      addMessage: mockAddMessage,
      clearMessages: vi.fn(),
      hasUserMessages: false,
      isOpen: true,
      messages: [],
      setIsOpen: mockSetIsOpen,
      toggleOpen: mockToggleOpen,
    });

    vi.mocked(useCopilotPageContext).mockReturnValue({
      context: { profile: { name: 'Jane Doe' } },
      page: '/dashboard',
    });

    vi.mocked(useCopilotChatMutation).mockReturnValue({
      isPending: false,
      mutateAsync: mockMutateAsync,
    } as unknown as ReturnType<typeof useCopilotChatMutation>);
  });

  it('renders the floating action button (FAB) in closed state', () => {
    vi.mocked(useCopilotSession).mockReturnValue({
      addMessage: mockAddMessage,
      clearMessages: vi.fn(),
      hasUserMessages: false,
      isOpen: false,
      messages: [],
      setIsOpen: mockSetIsOpen,
      toggleOpen: mockToggleOpen,
    });

    render(<CareerCopilot />);

    const fab = screen.getByRole('button', { name: CAREER_COPILOT_COPY.openAria });
    expect(fab).toBeInTheDocument();
    expect(fab).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles copilot panel when floating action button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useCopilotSession).mockReturnValue({
      addMessage: mockAddMessage,
      clearMessages: vi.fn(),
      hasUserMessages: false,
      isOpen: false,
      messages: [],
      setIsOpen: mockSetIsOpen,
      toggleOpen: mockToggleOpen,
    });

    render(<CareerCopilot />);

    const fab = screen.getByRole('button', { name: CAREER_COPILOT_COPY.openAria });
    await user.click(fab);

    expect(mockToggleOpen).toHaveBeenCalledTimes(1);
  });

  it('renders drawer header, messages, suggested prompts, and chat input when open', () => {
    vi.mocked(useCopilotSession).mockReturnValue({
      addMessage: mockAddMessage,
      clearMessages: vi.fn(),
      hasUserMessages: false,
      isOpen: true,
      messages: [
        {
          createdAt: '2026-08-06T10:00:00Z',
          id: '1',
          role: 'assistant',
          text: 'Welcome to Career Copilot!',
        },
      ],
      setIsOpen: mockSetIsOpen,
      toggleOpen: mockToggleOpen,
    });

    render(<CareerCopilot />);

    expect(screen.getByRole('heading', { level: 2, name: BRAND_NAME })).toBeInTheDocument();
    expect(screen.getByText(CAREER_COPILOT_COPY.subtitle)).toBeInTheDocument();
    expect(screen.getByText('Welcome to Career Copilot!')).toBeInTheDocument();

    // Suggested prompts grid should be visible when hasUserMessages is false
    expect(screen.getByLabelText(CAREER_COPILOT_COPY.suggestedPromptsAria)).toBeInTheDocument();
    expect(screen.getByText(COPILOT_SUGGESTED_PROMPTS[0])).toBeInTheDocument();

    // Chat input
    expect(screen.getByPlaceholderText(CHAT_INPUT_COPY.placeholder)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: CAREER_COPILOT_COPY.openAria }),
    ).not.toBeInTheDocument();
  });

  it('hides suggested prompts when user has already sent messages', () => {
    vi.mocked(useCopilotSession).mockReturnValue({
      addMessage: mockAddMessage,
      clearMessages: vi.fn(),
      hasUserMessages: true,
      isOpen: true,
      messages: [
        { createdAt: '2026-08-06T10:00:00Z', id: '1', role: 'user', text: 'Help with my resume' },
      ],
      setIsOpen: mockSetIsOpen,
      toggleOpen: mockToggleOpen,
    });

    render(<CareerCopilot />);

    expect(
      screen.queryByLabelText(CAREER_COPILOT_COPY.suggestedPromptsAria),
    ).not.toBeInTheDocument();
  });

  it('closes copilot panel when header close button is clicked', async () => {
    const user = userEvent.setup();

    render(<CareerCopilot />);

    const closeButton = screen.getByRole('button', { name: CAREER_COPILOT_COPY.closeAria });
    await user.click(closeButton);

    expect(mockSetIsOpen).toHaveBeenCalledWith(false);
  });

  it('sends user message successfully and receives assistant reply', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ reply: 'Here is your resume feedback.' });

    render(<CareerCopilot />);

    const input = screen.getByPlaceholderText(CHAT_INPUT_COPY.placeholder);
    await user.type(input, 'Review my resume');
    await user.type(input, '{Enter}');

    expect(mockAddMessage).toHaveBeenCalledWith({ role: 'user', text: 'Review my resume' });
    expect(mockMutateAsync).toHaveBeenCalledWith({
      context: { profile: { name: 'Jane Doe' } },
      message: 'Review my resume',
      page: '/dashboard',
    });

    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith({
        role: 'assistant',
        text: 'Here is your resume feedback.',
      });
    });
  });

  it('sends message when clicking a suggested prompt chip', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ reply: 'Sure, here are interview tips.' });

    render(<CareerCopilot />);

    const firstPrompt = COPILOT_SUGGESTED_PROMPTS[0];
    const promptChip = screen.getByRole('button', { name: firstPrompt });

    await user.click(promptChip);

    expect(mockAddMessage).toHaveBeenCalledWith({ role: 'user', text: firstPrompt });
    expect(mockMutateAsync).toHaveBeenCalledWith({
      context: { profile: { name: 'Jane Doe' } },
      message: firstPrompt,
      page: '/dashboard',
    });
  });

  it('shows thinking indicator when chat mutation is pending', () => {
    vi.mocked(useCopilotChatMutation).mockReturnValue({
      isPending: true,
      mutateAsync: mockMutateAsync,
    } as unknown as ReturnType<typeof useCopilotChatMutation>);

    render(<CareerCopilot />);

    expect(screen.getByText(CAREER_COPILOT_COPY.thinking)).toBeInTheDocument();
  });

  it('handles chat mutation failure and displays retry button', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValueOnce(new Error('Network Error'));

    render(<CareerCopilot />);

    const input = screen.getByPlaceholderText(CHAT_INPUT_COPY.placeholder);
    await user.type(input, 'Find me remote React jobs');
    await user.type(input, '{Enter}');

    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith({
        error: true,
        role: 'assistant',
        text: 'Network Error',
      });
    });
  });

  it('renders Dialog in mobile view when screen width is compact', () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);

    render(<CareerCopilot />);

    expect(screen.getByRole('heading', { level: 2, name: BRAND_NAME })).toBeInTheDocument();
  });
});
