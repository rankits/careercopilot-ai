import { Button } from '@/components/atoms';

import type { UploadedResumeVersion } from '@/features/resume/types/resume.types';
import {
  Box,
  Chip,
  DescriptionOutlinedIcon,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FileDownloadOutlinedIcon,
  Typography,
} from '@/lib/material';
import { borderRadius, colorTokens, spacing } from '@/tokens';

import {
  dialogActionsSx,
  dialogContainerSx,
  dialogContentSx,
  dialogPaperSx,
  dialogTitleSx,
  VersionMeta,
  VersionRow,
  VersionsEmpty,
  VersionsList,
} from './styles';

export interface ResumeVersionsDialogProps {
  downloadingId?: string | null;
  onClose: () => void;
  onDownload: (resume: UploadedResumeVersion) => void;
  open: boolean;
  resumes: UploadedResumeVersion[];
}

const formatBytes = (size: number) =>
  size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;

const formatUploadedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export function ResumeVersionsDialog({
  downloadingId = null,
  onClose,
  onDownload,
  open,
  resumes,
}: ResumeVersionsDialogProps) {
  return (
    <Dialog
      aria-describedby="resume-versions-description"
      aria-labelledby="resume-versions-title"
      fullWidth
      maxWidth="sm"
      onClose={onClose}
      open={open}
      scroll="paper"
      slotProps={{
        container: { sx: dialogContainerSx },
        paper: { sx: dialogPaperSx },
      }}
    >
      <DialogTitle id="resume-versions-title" sx={dialogTitleSx}>
        Uploaded resume versions
      </DialogTitle>
      <DialogContent dividers={false} sx={dialogContentSx}>
        <Typography color="text.secondary" id="resume-versions-description" mb={spacing[3]}>
          Every resume you upload is kept as a version. Download any previous file without replacing
          newer ones.
        </Typography>

        {resumes.length === 0 ? (
          <VersionsEmpty>
            <DescriptionOutlinedIcon color="disabled" />
            <Typography color="text.secondary" variant="body2">
              No uploaded resumes yet. Parse a resume on this page to start your version history.
            </Typography>
          </VersionsEmpty>
        ) : (
          <VersionsList>
            {resumes.map((resume, index) => (
              <VersionRow key={resume.id}>
                <Box alignItems="center" display="flex" gap={spacing[2]} minWidth={0}>
                  <Box
                    alignItems="center"
                    bgcolor={colorTokens.actionPrimarySurface}
                    borderRadius={borderRadius.lg}
                    color={colorTokens.actionPrimary}
                    display="flex"
                    flexShrink={0}
                    height={40}
                    justifyContent="center"
                    width={40}
                  >
                    <DescriptionOutlinedIcon fontSize="small" />
                  </Box>
                  <Box minWidth={0}>
                    <Typography fontWeight={700} noWrap>
                      Version {resume.version}
                      {index === 0 ? ' · Latest' : ''}
                    </Typography>
                    <Typography color="text.secondary" noWrap variant="body2">
                      {resume.originalName}
                    </Typography>
                    <VersionMeta>
                      <Typography color="text.secondary" component="span" variant="caption">
                        {formatUploadedAt(resume.uploadedAt)}
                      </Typography>
                      <Typography color="text.secondary" component="span" variant="caption">
                        {formatBytes(resume.sizeBytes)}
                      </Typography>
                      <Chip
                        color={resume.status === 'PROCESSED' ? 'success' : 'default'}
                        label={resume.status}
                        size="small"
                        variant="outlined"
                      />
                    </VersionMeta>
                  </Box>
                </Box>
                <Button
                  isLoading={downloadingId === resume.id}
                  onClick={() => onDownload(resume)}
                  size="small"
                  startIcon={<FileDownloadOutlinedIcon />}
                  type="button"
                  variant="outline"
                >
                  Download
                </Button>
              </VersionRow>
            ))}
          </VersionsList>
        )}
      </DialogContent>
      <DialogActions sx={dialogActionsSx}>
        <Button onClick={onClose} type="button" variant="ghost">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
