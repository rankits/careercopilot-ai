import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import {
  useCreateResumeVersion,
  useDeleteResumeVersion,
  useResumeVersions,
} from '@/features/auto-apply/hooks/useResumeVersions';

import { ROUTES } from '@/constants/routes';
import { hasAuthSession } from '@/features/auth/utils/authSession';
import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  DeleteOutlineIcon,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Paper,
  TextField,
  Typography,
} from '@/lib/material';
import {
  resumeBuilderService,
  type SavedResumeVersion,
  type UploadedResume,
} from '@/services/resumeBuilder.service';

const TAG_SUGGESTIONS = [
  'backend',
  'frontend',
  'fullstack',
  'mobile',
  'design',
  'product',
  'data',
  'devops',
  'leadership',
];

interface SelectableResume {
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
  const [pendingResume, setPendingResume] = useState<SelectableResume | null>(null);
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);

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

  const handleConfirmApprove = async () => {
    if (!pendingResume) return;
    setApproving(true);
    try {
      await createVersion.mutateAsync({
        resumeId: pendingResume.resumeId,
        label: pendingResume.defaultLabel,
        category: pendingResume.defaultCategory,
        tags: pendingTags,
      });
      showToast({ message: 'Resume approved for Auto Apply.', severity: 'success' });
      setPendingResume(null);
      setPendingTags([]);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to approve this resume.',
        severity: 'error',
      });
    } finally {
      setApproving(false);
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
          Approve a resume and add tags (for example &quot;mobile&quot; or &quot;backend&quot;) so
          we know when to use it. Manage files in{' '}
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
                      onClick={() => {
                        setPendingResume(resume);
                        setPendingTags(
                          resume.defaultCategory && resume.defaultCategory !== 'General'
                            ? [resume.defaultCategory.toLowerCase()]
                            : [],
                        );
                      }}
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
        <Typography variant="h6">Approved for Auto Apply</Typography>
        <Typography color="text.secondary" variant="body2">
          Tags help us match the right resume to a job (for example a mobile-tagged resume for a
          mobile design role).
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
                  {(version.tags?.length ?? 0) > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {version.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  )}
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

      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={() => !approving && setPendingResume(null)}
        open={Boolean(pendingResume)}
      >
        <DialogTitle>Approve resume</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography color="text.secondary" variant="body2">
            {pendingResume?.title}
          </Typography>
          <Autocomplete
            freeSolo
            multiple
            onChange={(_event, value) =>
              setPendingTags(
                value
                  .map((item) => (typeof item === 'string' ? item : item).trim().toLowerCase())
                  .filter(Boolean),
              )
            }
            options={TAG_SUGGESTIONS}
            renderInput={(params) => (
              <TextField
                {...params}
                helperText="Add tags so we know when to use this resume"
                label="Tags"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={key} label={option} size="small" {...tagProps} />;
              })
            }
            value={pendingTags}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={approving} onClick={() => setPendingResume(null)} variant="outline">
            Cancel
          </Button>
          <Button isLoading={approving} onClick={() => void handleConfirmApprove()}>
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
