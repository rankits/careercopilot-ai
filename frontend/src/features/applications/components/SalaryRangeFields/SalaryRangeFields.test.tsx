import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SalaryRangeFields } from './SalaryRangeFields';

describe('SalaryRangeFields', () => {
  it('renders minimum salary, maximum salary, dash separator, and currency dropdown', () => {
    render(
      <SalaryRangeFields
        currency="USD"
        onCurrencyChange={vi.fn()}
        onSalaryMaxChange={vi.fn()}
        onSalaryMinChange={vi.fn()}
        salaryMax="100000"
        salaryMin="50000"
      />,
    );

    const minInput = screen.getByPlaceholderText('Min');
    const maxInput = screen.getByPlaceholderText('Max');

    expect(minInput).toBeInTheDocument();
    expect(minInput).toHaveValue('50000');

    expect(maxInput).toBeInTheDocument();
    expect(maxInput).toHaveValue('100000');

    expect(screen.getByText('–')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'USD' })).toBeInTheDocument();
  });

  it('calls onSalaryMinChange when typing in the minimum salary input', async () => {
    const user = userEvent.setup();
    const handleMinChange = vi.fn();

    render(
      <SalaryRangeFields
        currency="USD"
        onCurrencyChange={vi.fn()}
        onSalaryMaxChange={vi.fn()}
        onSalaryMinChange={handleMinChange}
        salaryMax=""
        salaryMin=""
      />,
    );

    const minInput = screen.getByPlaceholderText('Min');
    await user.type(minInput, '60000');

    expect(handleMinChange).toHaveBeenCalled();
  });

  it('calls onSalaryMaxChange when typing in the maximum salary input', async () => {
    const user = userEvent.setup();
    const handleMaxChange = vi.fn();

    render(
      <SalaryRangeFields
        currency="USD"
        onCurrencyChange={vi.fn()}
        onSalaryMaxChange={handleMaxChange}
        onSalaryMinChange={vi.fn()}
        salaryMax=""
        salaryMin=""
      />,
    );

    const maxInput = screen.getByPlaceholderText('Max');
    await user.type(maxInput, '120000');

    expect(handleMaxChange).toHaveBeenCalled();
  });

  it('calls onSalaryMinBlur and onSalaryMaxBlur when inputs lose focus', () => {
    const handleMinBlur = vi.fn();
    const handleMaxBlur = vi.fn();

    render(
      <SalaryRangeFields
        currency="USD"
        onCurrencyChange={vi.fn()}
        onSalaryMaxBlur={handleMaxBlur}
        onSalaryMaxChange={vi.fn()}
        onSalaryMinBlur={handleMinBlur}
        onSalaryMinChange={vi.fn()}
        salaryMax="100000"
        salaryMin="50000"
      />,
    );

    const minInput = screen.getByPlaceholderText('Min');
    const maxInput = screen.getByPlaceholderText('Max');

    fireEvent.blur(minInput);
    expect(handleMinBlur).toHaveBeenCalledTimes(1);

    fireEvent.blur(maxInput);
    expect(handleMaxBlur).toHaveBeenCalledTimes(1);
  });

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
    expect(screen.getByPlaceholderText('Min')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Max')).toBeInTheDocument();
  });

  it('displays error message with role alert when salaryMinError is provided', () => {
    render(
      <SalaryRangeFields
        currency="USD"
        onCurrencyChange={vi.fn()}
        onSalaryMaxChange={vi.fn()}
        onSalaryMinChange={vi.fn()}
        salaryMax=""
        salaryMin="-500"
        salaryMinError="Minimum salary must be greater than 0."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/minimum salary must be greater than 0/i);
  });

  it('displays error messages with role alert when both salaryMinError and salaryMaxError are provided', () => {
    render(
      <SalaryRangeFields
        currency="USD"
        onCurrencyChange={vi.fn()}
        onSalaryMaxChange={vi.fn()}
        onSalaryMinChange={vi.fn()}
        salaryMax="30000"
        salaryMaxError="Maximum salary must be greater than minimum salary."
        salaryMin="50000"
        salaryMinError="Invalid minimum salary."
      />,
    );

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent(/invalid minimum salary/i);
    expect(alerts[1]).toHaveTextContent(/maximum salary must be greater than minimum salary/i);
  });

  it('calls onCurrencyChange when currency option is selected from dropdown', async () => {
    const user = userEvent.setup();
    const handleCurrencyChange = vi.fn();

    render(
      <SalaryRangeFields
        currency="USD"
        onCurrencyChange={handleCurrencyChange}
        onSalaryMaxChange={vi.fn()}
        onSalaryMinChange={vi.fn()}
        salaryMax="100000"
        salaryMin="50000"
      />,
    );

    const currencyButton = screen.getByRole('button', { name: 'USD' });
    expect(currencyButton).toBeInTheDocument();

    await user.click(currencyButton);
    const eurMenuItem = await screen.findByRole('menuitem', { name: /eur/i });
    await user.click(eurMenuItem);

    expect(handleCurrencyChange).toHaveBeenCalledWith('EUR');
  });
});
