import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ResumeUpload } from './ResumeUpload';

const validFile = new File(['resume'], 'resume.pdf', { type: 'application/pdf' });

describe('ResumeUpload', () => {
  it('renders the initial upload state and keeps the parse action available', async () => {
    const user = userEvent.setup();
    render(<ResumeUpload onUpload={vi.fn()} />);

    expect(screen.getByLabelText(/choose resume/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /parse resume/i })).toBeEnabled();

    await user.upload(screen.getByLabelText(/choose resume/i), validFile);
    expect(screen.getByText('resume.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /parse resume/i })).toBeEnabled();
  });

  it.each([
    [new File(['x'], 'resume.txt', { type: 'text/plain' }), /pdf, doc, or docx/i],
    [
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', {
        type: 'application/pdf',
      }),
      /10 mb/i,
    ],
  ])('rejects invalid file selection', async (file, message) => {
    const user = userEvent.setup({ applyAccept: false });
    render(<ResumeUpload onUpload={vi.fn()} />);

    await user.upload(screen.getByLabelText(/choose resume/i), file);
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: /parse resume/i })).toBeEnabled();
  });

  it('removes and replaces a selected file', async () => {
    const user = userEvent.setup();
    render(<ResumeUpload onUpload={vi.fn()} />);
    const input = screen.getByLabelText(/choose resume/i);

    await user.upload(input, validFile);
    await user.upload(
      input,
      new File(['doc'], 'updated.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );
    expect(screen.queryByText('resume.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('updated.docx')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove selected resume/i }));
    expect(screen.queryByText('updated.docx')).not.toBeInTheDocument();
  });

  it('reports uploading, parsing, success, and failure states', async () => {
    const user = userEvent.setup();
    let parsing: (() => void) | undefined;
    let complete: (() => void) | undefined;
    const onUpload = vi.fn((_file: File, onParsing: () => void) => {
      parsing = onParsing;
      return new Promise<void>((resolve) => {
        complete = resolve;
      });
    });
    const { rerender } = render(<ResumeUpload onUpload={onUpload} />);

    await user.upload(screen.getByLabelText(/choose resume/i), validFile);
    await user.click(screen.getByRole('button', { name: /parse resume/i }));
    expect(screen.getByText(/uploading resume/i)).toBeInTheDocument();

    parsing?.();
    rerender(<ResumeUpload onUpload={onUpload} />);
    expect(screen.getByText(/parsing resume/i)).toBeInTheDocument();

    complete?.();
    await waitFor(() =>
      expect(screen.getByText(/resume parsed successfully/i)).toBeInTheDocument(),
    );

    const failure = vi.fn().mockRejectedValue(new Error('Parser unavailable'));
    rerender(<ResumeUpload onUpload={failure} />);
    await user.upload(
      screen.getByLabelText(/choose resume/i),
      new File(['failed'], 'failed.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: /parse resume/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Parser unavailable');
  });
});
