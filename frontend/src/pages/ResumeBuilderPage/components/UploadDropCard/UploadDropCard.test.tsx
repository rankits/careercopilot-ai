import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { UploadDropCard } from './UploadDropCard';

describe('UploadDropCard', () => {
  it('renders upload instructions and reports selected files', () => {
    const fileInputRef = createRef<HTMLInputElement>();
    const onFileSelect = vi.fn();

    const { container } = render(
      <UploadDropCard
        fileInputRef={fileInputRef}
        isDragging={false}
        uploadError=""
        uploading={false}
        onDragStateChange={vi.fn()}
        onDrop={vi.fn()}
        onFileSelect={onFileSelect}
      />,
    );

    expect(screen.getByText(/Upload Your Resume/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag & drop your resume here/i)).toBeInTheDocument();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['resume'], 'resume.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('shows upload errors', () => {
    render(
      <UploadDropCard
        fileInputRef={createRef<HTMLInputElement>()}
        isDragging={false}
        uploadError="Please upload a PDF"
        uploading={false}
        onDragStateChange={vi.fn()}
        onDrop={vi.fn()}
        onFileSelect={vi.fn()}
      />,
    );

    expect(screen.getByText(/Please upload a PDF/i)).toBeInTheDocument();
  });
});
