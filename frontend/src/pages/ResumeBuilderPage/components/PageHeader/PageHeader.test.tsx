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

  it('shows target role and edit role action', () => {
    const onEditRole = vi.fn();
    render(
      <PageHeader
        canContinue
        current={5}
        onNext={vi.fn()}
        targetRole="Java Developer"
        onEditRole={onEditRole}
      />,
    );

    expect(screen.getByText(/Java Developer/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Edit role/i }));
    expect(onEditRole).toHaveBeenCalled();
  });
});
