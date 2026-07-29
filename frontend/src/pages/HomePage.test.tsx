import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders the app shell with header, sidebar, and home content', () => {
    render(<HomePage />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByLabelText(/primary navigation/i)).toBeInTheDocument();
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });
});
