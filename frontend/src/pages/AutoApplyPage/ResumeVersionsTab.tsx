import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import {
  useCreateResumeVersion,
  useDeleteResumeVersion,
  useResumeVersions,
  useUpdateResumeVersion,
} from '@/features/auto-apply/hooks/useResumeVersions';

import { ROUTES } from '@/constants/routes';
import { hasAuthSession } from '@/features/auth/utils/authSession';
import { setupTouchTargetSx } from '@/features/auto-apply/utils/setupFieldFocus';
import { resumeService } from '@/features/resume/services/resume.service';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  DeleteOutlineIcon,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Skeleton,
  Typography,
} from '@/lib/material';
import {
  resumeBuilderService,
  type SavedResumeVersion,
  type UploadedResume,
} from '@/services/resumeBuilder.service';

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
  const updateVersion = useUpdateResumeVersion();
  const deleteVersion = useDeleteResumeVersion();
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

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
  const profileQuery = useQuery({
    enabled: hasAuthSession(),
    queryFn: () => resumeService.getMyProfile(),
    queryKey: ['resume-profile', 'me'],
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

  const unapprovedCatalog = selectableResumes.filter(
    (resume) => !approvedResumeIds.has(resume.resumeId),
  );

  const handleApprove = async (resume: SelectableResume) => {
    setApprovingId(resume.resumeId);
    try {
      await createVersion.mutateAsync({
        resumeId: resume.resumeId,
        label: resume.defaultLabel,
        category: resume.defaultCategory,
        tags: [],
      });
      showToast({ message: 'Resume approved for Assisted Apply.', severity: 'success' });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "We couldn't update your resumes. Try again.",
        severity: 'error',
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await updateVersion.mutateAsync({ id, isDefault: true });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "We couldn't update your resumes. Try again.",
        severity: 'error',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const result = await deleteVersion.mutateAsync(deleteTarget.id);
      if (result.newDefaultLabel) {
        showToast({
          message: `Deleted. ${result.newDefaultLabel} is now your default.`,
          severity: 'success',
        });
      } else {
        showToast({ message: 'Resume removed from Assisted Apply.', severity: 'success' });
      }
      setDeleteTarget(null);
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "We couldn't update your resumes. Try again.",
        severity: 'error',
      });
    }
  };

  return (
    <Box
      aria-labelledby="setup-resumes-heading"
      id="setup-section-resumes"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 720 }}
    >
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }} variant="outlined">
        <Typography
          component="h2"
          data-setup-heading
          id="setup-resumes-heading"
          tabIndex={-1}
          variant="h6"
        >
          Primary resume
        </Typography>

        {versions?.find((version) => version.isActive) ? (
          <Box
            sx={{
              bgcolor: 'grey.50',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 220px' },
              p: 2,
            }}
          >
            <Box>
              <Typography fontWeight={700} variant="body2">
                {versions.find((version) => version.isActive)?.label}
              </Typography>
              <Typography color="success.main" variant="caption">
                Parsed successfully · Current primary
              </Typography>
            </Box>
            <Box>
              <Typography fontWeight={700} variant="caption">Parsing insights</Typography>
              <Typography color="text.secondary" display="block" variant="caption">
                {profileQuery.data?.skills.length ?? 0} skills · {profileQuery.data?.education.length ?? 0} education entries · {profileQuery.data?.experience.length ?? 0} roles
              </Typography>
            </Box>
          </Box>
        ) : null}

        {approvedLoading ? (
          <Box aria-busy="true" aria-label="Loading approved resumes">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton height={56} key={`resume-skeleton-${index}`} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : !versions || versions.length === 0 ? (
          <Box id="setup-field-defaultResume">
            <Typography sx={{ mb: 1.5 }} variant="body2">
              No approved resumes yet.
            </Typography>
            <Button
              component={RouterLink}
              sx={setupTouchTargetSx}
              to={ROUTES.RESUME_BUILDER}
              variant="outline"
            >
              Open Resume Builder
            </Button>
          </Box>
        ) : (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {versions.map((version, index) => (
              <Box
                component="li"
                key={version.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
                  py: 1.5,
                  borderTop: index === 0 ? 'none' : '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={600} noWrap variant="body2">
                    {version.label}
                  </Typography>
                  <Typography color="text.secondary" variant="caption">
                    {version.category}
                  </Typography>
                </Box>
                {version.isActive ? (
                  <Chip aria-label="Default resume" color="primary" label="Default" size="small" />
                ) : (
                  <Button
                    aria-label={`Set ${version.label} as default`}
                    isLoading={updateVersion.isPending}
                    onClick={() => void handleSetDefault(version.id)}
                    size="small"
                    sx={setupTouchTargetSx}
                    variant="outline"
                  >
                    Set as default
                  </Button>
                )}
                <IconButton
                  aria-label={`Delete ${version.label} from Assisted Apply`}
                  onClick={() => setDeleteTarget({ id: version.id, label: version.label })}
                  sx={setupTouchTargetSx}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {unapprovedCatalog.length > 0 ? (
        <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }} variant="outlined">
          <Typography component="h3" variant="subtitle1">
            Approve from Resume Builder
          </Typography>
          {savedQuery.isLoading || uploadedQuery.isLoading ? (
            <CircularProgress aria-label="Loading resume catalog" size={28} />
          ) : savedQuery.isError && uploadedQuery.isError ? (
            <Alert severity="error">Unable to load your resumes. Try again in a moment.</Alert>
          ) : (
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {unapprovedCatalog.map((resume, index) => (
                <Box
                  component="li"
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
                    {resume.subtitle ? (
                      <Typography color="text.secondary" noWrap variant="caption">
                        {resume.subtitle}
                      </Typography>
                    ) : null}
                  </Box>
                  <Button
                    aria-label={`Approve ${resume.title}`}
                    isLoading={approvingId === resume.resumeId}
                    onClick={() => void handleApprove(resume)}
                    size="small"
                    sx={setupTouchTargetSx}
                  >
                    Approve
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      ) : null}

      <Dialog
        aria-describedby="delete-resume-description"
        aria-labelledby="delete-resume-title"
        fullWidth
        maxWidth="xs"
        onClose={() => !deleteVersion.isPending && setDeleteTarget(null)}
        open={Boolean(deleteTarget)}
      >
        <DialogTitle id="delete-resume-title">Delete this resume from Assisted Apply?</DialogTitle>
        <DialogContent>
          <Typography id="delete-resume-description" variant="body2">
            This won&apos;t delete it from Resume Builder.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={deleteVersion.isPending}
            onClick={() => setDeleteTarget(null)}
            sx={setupTouchTargetSx}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            isLoading={deleteVersion.isPending}
            onClick={() => void handleConfirmDelete()}
            sx={setupTouchTargetSx}
            tone="danger"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
