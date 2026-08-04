import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WorkflowStepper } from './WorkflowStepper';

describe('WorkflowStepper', () => {
  it('highlights the active workflow step', () => {
    render(<WorkflowStepper current={2} />);

    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Define Role')).toBeInTheDocument();
    expect(screen.getByText('Analyze')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });
});
