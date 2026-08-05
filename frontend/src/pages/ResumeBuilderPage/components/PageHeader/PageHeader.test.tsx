import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('shows progress and triggers next', () => {
    const onNext = vi.fn();
    render(<PageHeader canContinue current={1} onNext={onNext} />);

    expect(screen.getByText('Resume Builder')).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(onNext).toHaveBeenCalled();
  });

  it('wires save draft when provided', () => {
    const onSaveDraft = vi.fn();
    render(
      <PageHeader
        canContinue
        current={5}
        onNext={vi.fn()}
        onSaveDraft={onSaveDraft}
        savingDraft={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Save Draft/i }));
    expect(onSaveDraft).toHaveBeenCalled();
  });

  it('shows Back when onBack is provided', () => {
    const onBack = vi.fn();
    render(<PageHeader canContinue current={2} onBack={onBack} onNext={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('hides Next and Save Draft on export step', () => {
    render(
      <PageHeader
        canContinue
        current={10}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onSaveDraft={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /Next/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Draft/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
  });
});
