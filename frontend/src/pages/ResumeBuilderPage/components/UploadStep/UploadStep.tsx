import type { DragEvent, RefObject } from 'react';

import type { UploadedResume } from '@/services/resumeBuilder.service';

import { SupportedResumeCard } from '../SupportedResumeCard';
import { UploadDropCard } from '../UploadDropCard';
import { UploadedResumeList } from '../UploadedResumeList';

import { MainGrid, UploadLayout } from './styles';

interface UploadStepProps {
  existingResumes: UploadedResume[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  isDragging: boolean;
  uploadError: string;
  uploading: boolean;
  onDragStateChange: (dragging: boolean) => void;
  onDrop: (event: DragEvent) => void;
  onFileSelect: (file: File) => void;
  onUseResume: (resume: UploadedResume) => void;
}

export function UploadStep({
  existingResumes,
  fileInputRef,
  isDragging,
  uploadError,
  uploading,
  onDragStateChange,
  onDrop,
  onFileSelect,
  onUseResume,
}: UploadStepProps) {
  return (
    <UploadLayout>
      <div className="upload-content">
        <MainGrid>
          <UploadDropCard
            fileInputRef={fileInputRef}
            isDragging={isDragging}
            uploadError={uploadError}
            uploading={uploading}
            onDragStateChange={onDragStateChange}
            onDrop={onDrop}
            onFileSelect={onFileSelect}
          />
          <SupportedResumeCard />
        </MainGrid>
        <UploadedResumeList resumes={existingResumes} onUseResume={onUseResume} />
      </div>
    </UploadLayout>
  );
}
