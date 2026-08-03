import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createEmptyDraft } from '../../utils';

import { SectionEditor } from './SectionEditor';

describe('SectionEditor', () => {
  it('edits summary text stably', () => {
    const onChange = vi.fn();
    const draft = { ...createEmptyDraft('Engineer'), summary: 'Backend engineer' };

    render(<SectionEditor section="summary" draft={draft} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/edit summary/i), {
      target: { value: 'Java backend engineer' },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Java backend engineer' }),
    );
  });

  it('adds a skill chip from the skills editor', () => {
    const onChange = vi.fn();
    const draft = createEmptyDraft('Engineer');

    render(
      <SectionEditor
        section="skills"
        draft={draft}
        recommendedSkills={['Java']}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText('+ Java'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ skillsList: expect.arrayContaining(['Java']) }),
    );
  });

  it('updates contact fields without wiping other draft data', () => {
    const onChange = vi.fn();
    const draft = {
      ...createEmptyDraft('Engineer'),
      fullName: 'Alex',
      summary: 'Keep me',
    };

    render(<SectionEditor section="summary" draft={draft} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Alex Rivera' },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Alex Rivera',
        summary: 'Keep me',
      }),
    );
  });
});
