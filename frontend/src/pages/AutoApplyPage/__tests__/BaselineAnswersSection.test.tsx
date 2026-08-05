import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';
import {
  useApplicationAnswers,
  useUpsertApplicationAnswer,
} from '@/features/auto-apply/hooks/useApplicationAnswers';

import { BaselineAnswersSection } from '../BaselineAnswersSection';
import { SetupDirtyProvider } from '../SetupDirtyContext';

vi.mock('@/features/auto-apply/hooks/useApplicationAnswers');

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SetupDirtyProvider onRequestDiscardConfirm={vi.fn()}>
          <BaselineAnswersSection />
        </SetupDirtyProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('BaselineAnswersSection AA-025', () => {
  const mockUpsertAnswer = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockUpsertAnswer.mockResolvedValue({});

    vi.mocked(useApplicationAnswers).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    vi.mocked(useUpsertApplicationAnswer).mockReturnValue({
      mutateAsync: mockUpsertAnswer,
      isPending: false,
    } as any);
  });

  it('renders plain-language baseline question labels', () => {
    renderSection();

    expect(
      screen.getByLabelText(/How many years of relevant experience do you have/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/years_of_experience/i),
    ).not.toBeInTheDocument();
  });

  it('validates numeric years of experience', async () => {
    const user = userEvent.setup();
    renderSection();

    const field = screen.getByLabelText(/How many years of relevant experience do you have/i);
    await user.type(field, '999');

    const saveButton = screen.getByRole('button', { name: /^Save$/i });
    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    expect(screen.getByText('Enter a valid number of years (0–80).')).toBeInTheDocument();
    expect(mockUpsertAnswer).not.toHaveBeenCalled();
  });

  it('saves baseline answers on happy path', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.type(
      screen.getByLabelText(/How many years of relevant experience do you have/i),
      '5',
    );
    await user.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() =>
      expect(mockUpsertAnswer).toHaveBeenCalledWith({
        questionKey: 'years_of_experience',
        answer: '5',
        autoSubmitAllowed: false,
      }),
    );
  });
});
