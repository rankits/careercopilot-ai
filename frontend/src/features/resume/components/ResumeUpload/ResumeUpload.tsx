import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';

import { Button } from '@/components/atoms';

import { resumePrimaryActionSx } from '@/features/resume/styles';
import type { ResumeParseProgress } from '@/features/resume/types/resume.types';
import { spacing } from '@/tokens';

import {
  DropZone,
  FileIcon,
  FilePanel,
  HiddenInput,
  ParsedLayout,
  resumeUploadSx,
  UploadCard,
} from './styles';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx'];
const ACCEPTED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

type UploadStatus = 'error' | 'initial' | 'parsing' | 'selected' | 'success' | 'uploading';

interface ResumeUploadProps {
  onRemove?: () => void;
  onUpload: (
    file: File,
    onParsing: () => void,
    onUploadProgress?: (progress: number) => void,
  ) => Promise<unknown>;
  parseProgress?: ResumeParseProgress | null;
  summary?: ReactNode;
}

const validateFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ACCEPTED_EXTENSIONS.includes(extension) || !ACCEPTED_TYPES.has(file.type)) {
    return 'Choose a PDF, DOC, or DOCX resume.';
  }
  if (file.size > MAX_FILE_SIZE) return 'Resume must be 10 MB or smaller.';
  return null;
};

const formatFileSize = (size: number) =>
  size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;

export function ResumeUpload({ onRemove, onUpload, parseProgress, summary }: ResumeUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('initial');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const busy = status === 'uploading' || status === 'parsing';

  const acceptFile = (selected?: File) => {
    if (!selected || busy) return;
    const validationError = validateFile(selected);
    setError(validationError);
    setFile(validationError ? null : selected);
    setStatus(validationError ? 'error' : 'selected');
    setUploadProgress(0);
    onRemove?.();
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    setStatus('initial');
    setUploadProgress(0);
    if (inputRef.current) inputRef.current.value = '';
    onRemove?.();
  };

  const upload = async () => {
    if (!file || busy) return;
    setError(null);
    setStatus('uploading');
    setUploadProgress(0);
    try {
      await onUpload(file, () => setStatus('parsing'), setUploadProgress);
      setStatus('success');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to parse the resume.');
      setStatus('error');
    }
  };

  const progress = status === 'uploading' ? uploadProgress : (parseProgress?.progress ?? 5);

  return (
    <UploadCard as="section" aria-label="Uploaded resume">
      <HiddenInput
        ref={inputRef}
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        aria-label="Choose resume"
        onChange={(event: ChangeEvent<HTMLInputElement>) => acceptFile(event.target.files?.[0])}
        type="file"
      />

      {status === 'success' && file ? (
        <ParsedLayout>
          <FilePanel>
            <FileIcon>
              <DescriptionOutlinedIcon sx={{ fontSize: 38 }} />
            </FileIcon>
            <Box minWidth={0}>
              <Typography fontWeight={700} noWrap title={file.name}>
                {file.name}
              </Typography>
              <Typography color="text.secondary" variant="caption">
                {formatFileSize(file.size)}
              </Typography>
              <Box mt={spacing[2]}>
                <Chip
                  color="success"
                  icon={<CheckCircleOutlineIcon />}
                  label="Resume parsed successfully"
                  size="small"
                />
              </Box>
            </Box>
            <Box display="flex" flexWrap="wrap" gap={spacing[2]} gridColumn="1 / -1">
              <Button
                onClick={() => inputRef.current?.click()}
                size="small"
                startIcon={<CloudUploadOutlinedIcon />}
                type="button"
                variant="outline"
              >
                Replace resume
              </Button>
              <Button
                aria-label="Remove selected resume"
                onClick={removeFile}
                size="small"
                startIcon={<DeleteOutlineIcon />}
                sx={resumeUploadSx.removeButton}
                tone="danger"
                type="button"
                variant="outline"
              >
                Remove resume
              </Button>
            </Box>
          </FilePanel>
          <Box p={spacing[5]}>{summary}</Box>
        </ParsedLayout>
      ) : (
        <DropZone
          active={isDragging}
          aria-label="Resume drop zone"
          aria-disabled={busy}
          hasError={Boolean(error)}
          onClick={() => !busy && inputRef.current?.click()}
          onDragEnter={(event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            acceptFile(event.dataTransfer.files[0]);
          }}
          role="button"
          tabIndex={0}
        >
          {file ? (
            <DescriptionOutlinedIcon color="primary" sx={{ fontSize: 42 }} />
          ) : (
            <CloudUploadOutlinedIcon color="primary" sx={{ fontSize: 42 }} />
          )}
          <Box>
            <Typography fontWeight={700}>{file ? file.name : 'Upload your resume'}</Typography>
            <Typography color="text.secondary" variant="body2">
              {file
                ? `${formatFileSize(file.size)} · Ready to parse`
                : 'Drag and drop or browse your device'}
            </Typography>
          </Box>
          <Button
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
            size="small"
            type="button"
            variant="outline"
          >
            {file ? 'Replace resume' : 'Browse files'}
          </Button>
          <Typography color="text.secondary" variant="caption">
            PDF, DOC or DOCX · Maximum 10 MB
          </Typography>
          {file ? (
            <Box display="flex" gap={spacing[2]}>
              <Button
                aria-label="Remove selected resume"
                disabled={busy}
                onClick={(event) => {
                  event.stopPropagation();
                  removeFile();
                }}
                size="small"
                startIcon={<DeleteOutlineIcon />}
                sx={resumeUploadSx.removeButton}
                tone="danger"
                type="button"
                variant="outline"
              >
                Remove resume
              </Button>
              <Button
                disabled={busy}
                isLoading={busy}
                onClick={(event) => {
                  event.stopPropagation();
                  void upload();
                }}
                size="medium"
                sx={resumePrimaryActionSx}
                type="button"
              >
                Parse resume
              </Button>
            </Box>
          ) : (
            <Button disabled size="medium" sx={resumePrimaryActionSx} type="button">
              Parse resume
            </Button>
          )}
        </DropZone>
      )}

      {busy ? (
        <Box aria-live="polite" px={spacing[5]} pb={spacing[5]}>
          <Box display="flex" justifyContent="space-between">
            <Typography role="status" variant="body2">
              {status === 'uploading' ? 'Uploading resume…' : 'Parsing resume…'}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {progress}%
            </Typography>
          </Box>
          <LinearProgress value={progress} variant="determinate" />
        </Box>
      ) : null}

      {error ? (
        <Box px={spacing[5]} pb={spacing[5]}>
          <Typography color="error" role="alert" variant="body2">
            {error}
          </Typography>
          {file ? (
            <Button onClick={() => void upload()} size="small" type="button" variant="ghost">
              Retry
            </Button>
          ) : null}
        </Box>
      ) : null}
    </UploadCard>
  );
}
