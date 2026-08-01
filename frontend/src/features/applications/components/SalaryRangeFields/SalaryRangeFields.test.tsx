import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SalaryRangeFields } from './SalaryRangeFields';

describe('SalaryRangeFields', () => {
  it('renders salary validation errors below inputs while keeping fields in the row', () => {
    render(
      <SalaryRangeFields
        currency="USD"
        onCurrencyChange={vi.fn()}
        onSalaryMaxChange={vi.fn()}
        onSalaryMinChange={vi.fn()}
        salaryMax="reer"
        salaryMaxError="Enter a valid maximum salary greater than 0."
        salaryMin=""
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      /enter a valid maximum salary greater than 0/i,
    );
    expect(screen.getByLabelText(/minimum salary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/maximum salary/i)).toBeInTheDocument();
  });
});
