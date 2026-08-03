import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UploadedResumeList } from './UploadedResumeList';

const makeResume = (id: string, name: string) => ({
  id,
  originalName: name,
  storedName: name,
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  status: 'READY',
  createdAt: '2026-08-01T10:00:00.000Z',
});

describe('UploadedResumeList', () => {
  it('renders resumes and allows selection', () => {
    const onUseResume = vi.fn();
    const resumes = [makeResume('r1', 'jane-doe.pdf')];
    render(<UploadedResumeList resumes={resumes as never} onUseResume={onUseResume} />);

    expect(screen.getByText('Your Uploaded Resumes')).toBeInTheDocument();
    expect(screen.getByText('jane-doe.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /use/i }));
    expect(onUseResume).toHaveBeenCalledWith(resumes[0]);
  });

  it('shows only the top 3 uploaded resumes', () => {
    const resumes = [
      makeResume('r1', 'one.pdf'),
      makeResume('r2', 'two.pdf'),
      makeResume('r3', 'three.pdf'),
      makeResume('r4', 'four.pdf'),
      makeResume('r5', 'five.pdf'),
    ];
    render(<UploadedResumeList resumes={resumes as never} onUseResume={vi.fn()} />);

    expect(screen.getByText('one.pdf')).toBeInTheDocument();
    expect(screen.getByText('two.pdf')).toBeInTheDocument();
    expect(screen.getByText('three.pdf')).toBeInTheDocument();
    expect(screen.queryByText('four.pdf')).not.toBeInTheDocument();
    expect(screen.queryByText('five.pdf')).not.toBeInTheDocument();
  });

  it('shows empty state when there are no resumes', () => {
    render(<UploadedResumeList resumes={[]} onUseResume={vi.fn()} />);
    expect(
      screen.getByText(/Upload a resume to start building your optimized version/i),
    ).toBeInTheDocument();
  });
});
