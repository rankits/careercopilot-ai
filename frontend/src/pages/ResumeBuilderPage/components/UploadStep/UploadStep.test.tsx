import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { UploadStep } from './UploadStep';

describe('UploadStep', () => {
  it('composes drop zone, supported types, and uploaded resume list', () => {
    render(
      <UploadStep
        existingResumes={[]}
        fileInputRef={createRef<HTMLInputElement>()}
        isDragging={false}
        uploadError=""
        uploading={false}
        onDragStateChange={vi.fn()}
        onDrop={vi.fn()}
        onFileSelect={vi.fn()}
        onUseResume={vi.fn()}
        onDeleteResume={vi.fn()}
        onShowMoreResumes={vi.fn()}
      />,
    );

    expect(screen.getByText(/Upload Your Resume/i)).toBeInTheDocument();
    expect(screen.getByText(/What types of resume are supported/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Uploaded Resumes/i)).toBeInTheDocument();
  });
});
