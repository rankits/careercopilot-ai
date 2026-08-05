import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';
import { ROUTES } from '@/constants/routes';
import { hasAuthSession } from '@/features/auth/utils/authSession';
import {
  useCreateResumeVersion,
  useDeleteResumeVersion,
  useResumeVersions,
} from '@/features/auto-apply/hooks/useResumeVersions';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  DeleteOutlineIcon,
  IconButton,
  Link,
  Paper,
  Typography,
} from '@/lib/material';
import {
  resumeBuilderService,
  type SavedResumeVersion,
  type UploadedResume,
} from '@/services/resumeBuilder.service';

interface SelectableResume {
  /** Resume table UUID used by auto-apply approve API */
  resumeId: string;
  title: string;
  subtitle: string;
  defaultLabel: string;
  defaultCategory: string;
}

function toSelectableFromSaved(version: SavedResumeVersion): SelectableResume {
  const title = version.label?.trim() || version.targetRole?.trim() || version.resumeFileName;
  return {
    resumeId: version.resumeId,
    title,
    subtitle: [
      version.targetRole?.trim() || null,
      version.atsScore > 0 ? `ATS ${version.atsScore}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    defaultLabel: title,
    defaultCategory: version.targetRole?.trim() || 'General',
  };
}

function toSelectableFromUpload(resume: UploadedResume): SelectableResume {
  const title = resume.originalName || resume.fileName;
  return {
    resumeId: resume.id,
    title,
    subtitle: resume.status,
    defaultLabel: title,
    defaultCategory: 'General',
  };
}

/**
 * Prefer saved builder versions (what users see on Saved Resumes), then
 * include any uploaded resumes not already represented. Dedupes by resumeId.
 */
function buildSelectableResumes(
  saved: SavedResumeVersion[] | undefined,
  uploaded: UploadedResume[] | undefined,
): SelectableResume[] {
  const byResumeId = new Map<string, SelectableResume>();

  for (const version of saved ?? []) {
    if (!version.resumeId || byResumeId.has(version.resumeId)) continue;
    byResumeId.set(version.resumeId, toSelectableFromSaved(version));
  }

  for (const resume of uploaded ?? []) {
    if (byResumeId.has(resume.id)) continue;
    byResumeId.set(resume.id, toSelectableFromUpload(resume));
  }

  return Array.from(byResumeId.values());
}

export function ResumeVersionsTab() {
  const { data: versions, isLoading: approvedLoading } = useResumeVersions();
  const createVersion = useCreateResumeVersion();
  const deleteVersion = useDeleteResumeVersion();
  const { showToast } = useToast();
  const [approvingResumeId, setApprovingResumeId] = useState<string | null>(null);

  const savedQuery = useQuery({
    enabled: hasAuthSession(),
    queryFn: () => resumeBuilderService.listSavedVersions(),
    queryKey: ['resume-builder', 'saved-versions'],
    staleTime: 30_000,
  });

  const uploadedQuery = useQuery({
    enabled: hasAuthSession(),
    queryFn: () => resumeBuilderService.listResumes(),
    queryKey: ['resume-builder', 'uploaded-resumes'],
    staleTime: 30_000,
  });

  const selectableResumes = useMemo(
    () => buildSelectableResumes(savedQuery.data, uploadedQuery.data),
    [savedQuery.data, uploadedQuery.data],
  );

  const approvedResumeIds = useMemo(
    () => new Set((versions ?? []).map((version) => version.resumeId)),
    [versions],
  );

  const resumesLoading = savedQuery.isLoading || uploadedQuery.isLoading;
  const resumesError = savedQuery.isError && uploadedQuery.isError;

  const handleApprove = async (resume: SelectableResume) => {
    setApprovingResumeId(resume.resumeId);
    try {
      await createVersion.mutateAsync({
        resumeId: resume.resumeId,
        label: resume.defaultLabel,
        category: resume.defaultCategory,
      });
      showToast({ message: 'Resume approved for auto-apply.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to approve this resume.',
        severity: 'error',
      });
    } finally {
      setApprovingResumeId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVersion.mutateAsync(id);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to remove this resume version.',
        severity: 'error',
      });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 720 }}>
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }} variant="outlined">
        <Typography variant="h6">Your resumes</Typography>
        <Typography color="text.secondary" variant="body2">
          Approve a resume for the planner to use. Manage files in{' '}
          <Link component={RouterLink} to={ROUTES.SAVED_RESUMES} underline="hover">
            Saved Resumes
          </Link>{' '}
          or build a new one in the{' '}
          <Link component={RouterLink} to={ROUTES.RESUME_BUILDER} underline="hover">
            Resume Builder
          </Link>
          .
        </Typography>

        {resumesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : resumesError ? (
          <Alert severity="error">Unable to load your resumes. Try again in a moment.</Alert>
        ) : selectableResumes.length === 0 ? (
          <Alert severity="info">
            No resumes found yet.{' '}
            <Link component={RouterLink} to={ROUTES.RESUME_BUILDER} underline="hover">
              Upload or build a resume
            </Link>{' '}
            first, then come back to approve it here.
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {selectableResumes.map((resume, index) => {
              const alreadyApproved = approvedResumeIds.has(resume.resumeId);
              return (
                <Box
                  key={resume.resumeId}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1.5,
                    borderTop: index === 0 ? 'none' : '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={600} noWrap variant="body2">
                      {resume.title}
                    </Typography>
                    {resume.subtitle && (
                      <Typography color="text.secondary" noWrap variant="caption">
                        {resume.subtitle}
                      </Typography>
                    )}
                  </Box>
                  {alreadyApproved ? (
                    <Chip color="success" label="Approved" size="small" variant="outlined" />
                  ) : (
                    <Button
                      isLoading={approvingResumeId === resume.resumeId}
                      onClick={() => void handleApprove(resume)}
                      size="small"
                      variant="outline"
                    >
                      Approve
                    </Button>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }} variant="outlined">
        <Typography variant="h6">Approved for auto-apply</Typography>
        <Typography color="text.secondary" variant="body2">
          The planner selects the active version in the matching category.
        </Typography>

        {approvedLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : !versions || versions.length === 0 ? (
          <Alert severity="info">No approved resume versions yet.</Alert>
        ) : (
          <Box>
            {versions.map((version, index) => (
              <Box
                key={version.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 1.5,
                  borderTop: index === 0 ? 'none' : '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={600} noWrap variant="body2">
                    {version.label}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {version.category}
                  </Typography>
                </Box>
                <Chip
                  color={version.isActive ? 'success' : 'default'}
                  label={version.isActive ? 'Active' : 'Inactive'}
                  size="small"
                  variant="outlined"
                />
                <IconButton
                  aria-label="Remove approved resume"
                  onClick={() => void handleDelete(version.id)}
                  size="small"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
