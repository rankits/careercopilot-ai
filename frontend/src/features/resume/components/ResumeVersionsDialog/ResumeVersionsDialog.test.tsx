import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ResumeVersionsDialog } from './ResumeVersionsDialog';

const resumes = [
  {
    id: 'resume-2',
    mimeType: 'application/pdf',
    originalName: 'latest.pdf',
    processedAt: null,
    sizeBytes: 4096,
    status: 'PROCESSED',
    uploadedAt: '2026-08-04T12:00:00.000Z',
    version: 2,
  },
  {
    id: 'resume-1',
    mimeType: 'application/pdf',
    originalName: 'first.pdf',
    processedAt: null,
    sizeBytes: 2048,
    status: 'PROCESSED',
    uploadedAt: '2026-08-01T10:00:00.000Z',
    version: 1,
  },
];

describe('ResumeVersionsDialog', () => {
  it('lists versions with download actions when open', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleDownload = vi.fn();

    render(
      <ResumeVersionsDialog
        onClose={handleClose}
        onDownload={handleDownload}
        open
        resumes={resumes}
      />,
    );

    expect(screen.getByRole('dialog', { name: /uploaded resume versions/i })).toBeInTheDocument();
    expect(screen.getByText(/version 2 · latest/i)).toBeInTheDocument();
    expect(screen.getByText(/latest\.pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/first\.pdf/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /download/i })[0]!);
    expect(handleDownload).toHaveBeenCalledWith(resumes[0]);

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when there are no uploads', () => {
    render(<ResumeVersionsDialog onClose={vi.fn()} onDownload={vi.fn()} open resumes={[]} />);

    expect(screen.getByText(/no uploaded resumes yet/i)).toBeInTheDocument();
  });
});
