import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MatchScoreHelpNote } from './MatchScoreHelpNote';

describe('MatchScoreHelpNote', () => {
  it('renders a visible help banner with title and profile copy', () => {
    render(<MatchScoreHelpNote mode="profile" />);

    expect(screen.getByRole('note', { name: /how match % works/i })).toBeInTheDocument();
    expect(screen.getByText(/fits your profile/i)).toBeInTheDocument();
  });

  it('renders resume-specific help copy', () => {
    render(<MatchScoreHelpNote mode="resume" />);

    expect(screen.getByText(/fits your resume/i)).toBeInTheDocument();
  });
});
