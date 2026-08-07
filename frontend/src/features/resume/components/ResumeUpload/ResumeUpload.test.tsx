import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ResumeUpload } from './ResumeUpload';

const validPdfFile = new File(['pdf content'], 'my_resume.pdf', { type: 'application/pdf' });
const validDocxFile = new File(['docx content'], 'my_resume.docx', {
  type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
});

describe('ResumeUpload', () => {
  it('renders initial drop zone state correctly', () => {
    render(<ResumeUpload onUpload={vi.fn()} />);

    expect(screen.getByText('Upload your resume')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop or browse your device')).toBeInTheDocument();
    expect(screen.getByLabelText('Choose resume')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse files/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /parse resume/i })).toBeDisabled();
  });

  it('selects a valid PDF file and displays file name and size', async () => {
    const user = userEvent.setup();
    render(<ResumeUpload onUpload={vi.fn()} />);

    const input = screen.getByLabelText('Choose resume');
    await user.upload(input, validPdfFile);

    expect(screen.getByText('my_resume.pdf')).toBeInTheDocument();
    expect(screen.getByText(/ready to parse/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove selected resume/i })).toBeInTheDocument();
  });

  it.each([
    [
      new File(['invalid'], 'document.txt', { type: 'text/plain' }),
      /choose a pdf, doc, or docx resume/i,
    ],
    [
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large_resume.pdf', {
        type: 'application/pdf',
      }),
      /resume must be 10 mb or smaller/i,
    ],
  ])(
    'displays validation error alert when selecting an invalid file',
    async (file, expectedError) => {
      const user = userEvent.setup({ applyAccept: false });
      render(<ResumeUpload onUpload={vi.fn()} />);

      const input = screen.getByLabelText('Choose resume');
      await user.upload(input, file);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(expectedError);
    },
  );

  it('supports drag and drop file upload', async () => {
    render(<ResumeUpload onUpload={vi.fn()} />);

    const dropZone = screen.getByLabelText('Resume drop zone');

    fireEvent.dragEnter(dropZone, { preventDefault: vi.fn() });
    fireEvent.dragOver(dropZone, { preventDefault: vi.fn() });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [validDocxFile] },
      preventDefault: vi.fn(),
    });

    expect(screen.getByText('my_resume.docx')).toBeInTheDocument();
  });

  it('removes selected file and triggers onRemove callback', async () => {
    const user = userEvent.setup();
    const handleRemove = vi.fn();

    render(<ResumeUpload onRemove={handleRemove} onUpload={vi.fn()} />);

    const input = screen.getByLabelText('Choose resume');
    await user.upload(input, validPdfFile);
    expect(screen.getByText('my_resume.pdf')).toBeInTheDocument();

    const removeBtn = screen.getByRole('button', { name: /remove selected resume/i });
    await user.click(removeBtn);

    expect(screen.queryByText('my_resume.pdf')).not.toBeInTheDocument();
    expect(handleRemove).toHaveBeenCalledTimes(2); // Called on file accept & on remove click
  });

  it('handles full upload, parsing, and success completion state with summary', async () => {
    const user = userEvent.setup();
    let parsingCallback: (() => void) | undefined;
    let completeUpload: (() => void) | undefined;

    const onUpload = vi.fn((_file: File, onParsing: () => void) => {
      parsingCallback = onParsing;
      return new Promise<void>((resolve) => {
        completeUpload = resolve;
      });
    });

    render(
      <ResumeUpload
        onUpload={onUpload}
        summary={<div data-testid="resume-summary">Parsed Summary Content</div>}
      />,
    );

    await user.upload(screen.getByLabelText('Choose resume'), validPdfFile);
    await user.click(screen.getByRole('button', { name: /parse resume/i }));

    expect(screen.getByText(/uploading resume/i)).toBeInTheDocument();

    act(() => {
      parsingCallback?.();
    });
    expect(screen.getByText(/parsing resume/i)).toBeInTheDocument();

    await act(async () => {
      completeUpload?.();
    });

    await waitFor(() => {
      expect(screen.getByText('Resume parsed successfully')).toBeInTheDocument();
      expect(screen.getByTestId('resume-summary')).toHaveTextContent('Parsed Summary Content');
    });
  });

  it('handles upload failure and allows retrying upload', async () => {
    const user = userEvent.setup();
    const mockUpload = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error during upload'))
      .mockResolvedValueOnce(undefined);

    render(<ResumeUpload onUpload={mockUpload} />);

    await user.upload(screen.getByLabelText('Choose resume'), validPdfFile);
    await user.click(screen.getByRole('button', { name: /parse resume/i }));

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toHaveTextContent('Network error during upload');

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    expect(mockUpload).toHaveBeenCalledTimes(2);
  });
});
