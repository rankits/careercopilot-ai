import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HeaderSearch } from './HeaderSearch';

describe('HeaderSearch', () => {
  it('renders the default search placeholder', () => {
    render(<HeaderSearch />);

    expect(screen.getByRole('textbox', { name: /search/i })).toHaveAttribute(
      'placeholder',
      'Search jobs, companies, skills...',
    );
  });

  it('supports custom value, placeholder, and change handler', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<HeaderSearch onChange={handleChange} placeholder="Search roles" value="" />);

    await user.type(screen.getByRole('textbox', { name: /search/i }), 'react');

    expect(screen.getByRole('textbox', { name: /search/i })).toHaveAttribute(
      'placeholder',
      'Search roles',
    );
    expect(handleChange).toHaveBeenCalled();
  });
});
