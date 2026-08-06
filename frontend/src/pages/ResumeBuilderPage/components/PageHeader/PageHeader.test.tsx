import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders progress and next action', () => {
    const onNext = vi.fn();
    render(<PageHeader canContinue current={1} onNext={onNext} />);

    expect(screen.getByText(/Resume Builder/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(onNext).toHaveBeenCalled();
  });

  it('does not render Save Draft', () => {
    render(<PageHeader canContinue current={2} onNext={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Save Draft/i })).not.toBeInTheDocument();
  });

  it('shows Back when onBack is provided', () => {
    const onBack = vi.fn();
    render(<PageHeader canContinue current={2} onBack={onBack} onNext={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('hides Back and Next on export step', () => {
    render(<PageHeader canContinue current={10} onNext={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /Next/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Back/i })).not.toBeInTheDocument();
  });
});
