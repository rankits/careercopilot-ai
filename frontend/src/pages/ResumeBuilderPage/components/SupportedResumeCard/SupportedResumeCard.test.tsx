import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SupportedResumeCard } from './SupportedResumeCard';

describe('SupportedResumeCard', () => {
  it('lists supported resume types', () => {
    render(<SupportedResumeCard />);

    expect(screen.getByText(/What types of resume are supported/i)).toBeInTheDocument();
    expect(screen.getByText('Chronological Resume')).toBeInTheDocument();
    expect(screen.getByText('Student Resume')).toBeInTheDocument();
  });
});
