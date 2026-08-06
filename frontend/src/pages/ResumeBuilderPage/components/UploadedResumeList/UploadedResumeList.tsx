import { useState } from 'react';

import { Button } from '@/components/atoms';

import {
  Box,
  DeleteOutlineIcon,
  DescriptionOutlinedIcon,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InsightsOutlinedIcon,
  SecurityOutlinedIcon,
  Typography,
} from '@/lib/material';
import type { UploadedResume } from '@/services/resumeBuilder.service';

import {
  formatFileSize,
  formatResumeDate,
  getResumeExtension,
  getResumeVersion,
} from '../../utils';

import {
  CardSubtitle,
  CardTitle,
  EmptyText,
  FileTile,
  ResumeListCard,
  ResumeRow,
  StatusPill,
} from './styles';

interface UploadedResumeListProps {
  resumes: UploadedResume[];
  deletingId?: string | null;
  onUseResume: (resume: UploadedResume) => void;
  onDeleteResume: (resume: UploadedResume) => void | Promise<void>;
  onShowMore: () => void;
}

export function UploadedResumeList({
  resumes,
  deletingId = null,
  onUseResume,
  onDeleteResume,
  onShowMore,
}: UploadedResumeListProps) {
  const [deleteTarget, setDeleteTarget] = useState<UploadedResume | null>(null);
  const latestResumes = resumes.slice(0, 3);
  const hasMore = resumes.length > 3;
  const isDeleting = Boolean(deleteTarget && deletingId === deleteTarget.id);

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDeleteResume(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <ResumeListCard>
      <Box className="list-header">
        <Box>
          <CardTitle>Your Uploaded Resumes</CardTitle>
          <CardSubtitle mt={1}>Manage and select a resume to continue.</CardSubtitle>
        </Box>
        <Button
          size="small"
          startIcon={<InsightsOutlinedIcon fontSize="small" />}
          variant="outline"
        >
          Newest First
        </Button>
      </Box>

      {latestResumes.map((resume, index) => {
        const extension = getResumeExtension(resume.originalName);
        const fileSize = formatFileSize(resume.sizeBytes);

        return (
          <ResumeRow key={resume.id}>
            <FileTile extension={extension}>
              <DescriptionOutlinedIcon fontSize="small" />
              {extension}
            </FileTile>
            <Box className="resume-meta">
              <Typography className="resume-name">{resume.originalName}</Typography>
              <Typography className="resume-subtext">
                Uploaded on {formatResumeDate(resume.createdAt)}
                {fileSize ? ` - ${fileSize}` : ''}
              </Typography>
              <Box className="badge-row">
                <StatusPill>{resume.status}</StatusPill>
              </Box>
            </Box>
            <Typography className="resume-version">Version {getResumeVersion(index)}</Typography>
            <Box className="resume-actions">
              <Button size="small" onClick={() => onUseResume(resume)}>
                Use This Resume
              </Button>
            </Box>
            <IconButton
              aria-label={`Delete ${resume.originalName}`}
              className="resume-menu"
              disabled={deletingId === resume.id}
              onClick={() => setDeleteTarget(resume)}
              size="small"
            >
              <DeleteOutlineIcon className="more-icon" fontSize="small" />
            </IconButton>
          </ResumeRow>
        );
      })}

      {resumes.length === 0 && (
        <EmptyText>Upload a resume to start building your optimized version.</EmptyText>
      )}

      {hasMore ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button size="medium" variant="outline" onClick={onShowMore}>
            Show more
          </Button>
        </Box>
      ) : null}

      <Box className="footer-notice">
        <SecurityOutlinedIcon className="security-icon" />
        <Typography className="footer-text">
          Your data is secure and encrypted. We never share your information.
        </Typography>
      </Box>

      <Dialog open={Boolean(deleteTarget)} onClose={closeDeleteDialog} fullWidth maxWidth="xs">
        <DialogTitle>Delete resume?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{' '}
            <strong>{deleteTarget?.originalName ?? 'this resume'}</strong>? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <Button disabled={isDeleting} onClick={closeDeleteDialog} variant="outline">
            Cancel
          </Button>
          <Button disabled={isDeleting} isLoading={isDeleting} onClick={() => void confirmDelete()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </ResumeListCard>
  );
}
