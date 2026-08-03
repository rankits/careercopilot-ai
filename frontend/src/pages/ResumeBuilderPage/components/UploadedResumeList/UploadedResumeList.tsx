import { Button } from '@/components/atoms';

import {
  Box,
  DescriptionOutlinedIcon,
  InsightsOutlinedIcon,
  MoreVertIcon,
  SecurityOutlinedIcon,
  Typography,
} from '@/lib/material';
import type { UploadedResume } from '@/services/resumeBuilder.service';

import { formatFileSize, formatResumeDate, getResumeExtension, getResumeVersion } from '../../utils';

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
  onUseResume: (resume: UploadedResume) => void;
}

export function UploadedResumeList({ resumes, onUseResume }: UploadedResumeListProps) {
  return (
    <ResumeListCard>
      <Box className="list-header">
        <Box>
          <CardTitle>Your Uploaded Resumes</CardTitle>
          <CardSubtitle mt={1}>Manage and select a resume to continue.</CardSubtitle>
        </Box>
        <Button size="small" startIcon={<InsightsOutlinedIcon fontSize="small" />} variant="outline">
          Newest First
        </Button>
      </Box>

      {resumes.slice(0, 3).map((resume, index) => {
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
            <MoreVertIcon className="resume-menu more-icon" />
          </ResumeRow>
        );
      })}

      {resumes.length === 0 && (
        <EmptyText>Upload a resume to start building your optimized version.</EmptyText>
      )}

      <Box className="footer-notice">
        <SecurityOutlinedIcon className="security-icon" />
        <Typography className="footer-text">
          Your data is secure and encrypted. We never share your information.
        </Typography>
      </Box>
    </ResumeListCard>
  );
}
