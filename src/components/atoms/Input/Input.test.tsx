import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from './Input';

describe('Input', () => {
  it('renders an accessible textbox with label and value', () => {
    render(<Input label="Email" value="hello@careercopilot.com" />);

    expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('hello@careercopilot.com');
  });

  it('renders helper text when there is no error', () => {
    render(<Input helperText="Use your work email" label="Email" />);

    expect(screen.getByText(/use your work email/i)).toBeInTheDocument();
  });

  it('prefers error text and marks the field invalid', () => {
    render(
      <Input errorMessage="Email is required" helperText="Use your work email" label="Email" />,
    );

    const input = screen.getByRole('textbox', { name: /email/i });

    expect(input).toBeInvalid();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.queryByText(/use your work email/i)).not.toBeInTheDocument();
  });

  it('renders start and end adornments', () => {
    render(<Input endAdornment=".com" label="Domain" startAdornment="https://" />);

    expect(screen.getByText('https://')).toBeInTheDocument();
    expect(screen.getByText('.com')).toBeInTheDocument();
  });

  it('supports success tone and filled variant', () => {
    render(
      <Input
        helperText="Looks good"
        inputVariant="filled"
        label="Portfolio"
        tone="success"
        value="https://careercopilot.dev"
      />,
    );

    expect(screen.getByRole('textbox', { name: /portfolio/i })).toHaveValue(
      'https://careercopilot.dev',
    );
    expect(screen.getByText(/looks good/i)).toBeInTheDocument();
  });
});
