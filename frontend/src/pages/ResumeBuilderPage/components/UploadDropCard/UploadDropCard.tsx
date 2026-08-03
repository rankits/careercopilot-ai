import type { DragEvent, RefObject } from 'react';

import {
  Box,
  CircularProgress,
  CloudUploadOutlinedIcon,
  FolderOutlinedIcon,
  Typography,
} from '@/lib/material';
import { colorTokens } from '@/tokens';

import { CardSubtitle, CardTitle, DropZone, ErrorText, UploadCard } from './styles';

interface UploadDropCardProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  isDragging: boolean;
  uploadError: string;
  uploading: boolean;
  onDragStateChange: (dragging: boolean) => void;
  onDrop: (event: DragEvent) => void;
  onFileSelect: (file: File) => void;
}

export function UploadDropCard({
  fileInputRef,
  isDragging,
  uploadError,
  uploading,
  onDragStateChange,
  onDrop,
  onFileSelect,
}: UploadDropCardProps) {
  return (
    <UploadCard>
      <Box>
        <CardTitle component="h2">Upload Your Resume</CardTitle>
        <CardSubtitle mt={1}>Supports PDF, DOCX, and TXT files up to 10 MB.</CardSubtitle>
      </Box>

      <DropZone
        dragging={isDragging}
        onDragOver={(event) => {
          event.preventDefault();
          onDragStateChange(true);
        }}
        onDragLeave={() => onDragStateChange(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFileSelect(file);
          }}
        />

        {uploading ? (
          <CircularProgress size={32} sx={{ color: colorTokens.actionPrimary }} />
        ) : (
          <>
            <Box className="upload-icon-box">
              <CloudUploadOutlinedIcon className="upload-icon" />
            </Box>
            <Box className="upload-copy">
              <Typography className="upload-title">Drag & drop your resume here</Typography>
              <Typography className="upload-subtitle">or click to browse files</Typography>
            </Box>
            <Box className="browse-button" component="span">
              <FolderOutlinedIcon fontSize="small" />
              Browse Files
            </Box>
          </>
        )}
      </DropZone>

      {uploadError && <ErrorText>{uploadError}</ErrorText>}
    </UploadCard>
  );
}
