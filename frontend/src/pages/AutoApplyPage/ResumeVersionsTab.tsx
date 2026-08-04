import { useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

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
  Paper,
  TextField,
  Typography,
} from '@/lib/material';

export function ResumeVersionsTab() {
  const { data: versions, isLoading } = useResumeVersions();
  const createVersion = useCreateResumeVersion();
  const deleteVersion = useDeleteResumeVersion();
  const { showToast } = useToast();

  const [resumeId, setResumeId] = useState('');
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('');

  const handleAdd = async () => {
    try {
      await createVersion.mutateAsync({
        resumeId: resumeId.trim(),
        label: label.trim(),
        category: category.trim(),
      });
      setResumeId('');
      setLabel('');
      setCategory('');
      showToast({ message: 'Resume version approved.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to approve this resume version.',
        severity: 'error',
      });
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
        <Typography variant="h6">Approved resume versions</Typography>
        <Typography color="text.secondary" variant="body2">
          The planner selects the active version in the matching category. Find a resume&apos;s ID
          from the Resume Builder / Saved Resumes page.
        </Typography>

        <TextField
          fullWidth
          helperText="From Saved Resumes"
          label="Resume ID"
          onChange={(event) => setResumeId(event.target.value)}
          value={resumeId}
        />
        <TextField
          fullWidth
          helperText='e.g. "Backend Resume"'
          label="Label"
          onChange={(event) => setLabel(event.target.value)}
          value={label}
        />
        <TextField
          fullWidth
          helperText='e.g. "Backend"'
          label="Category"
          onChange={(event) => setCategory(event.target.value)}
          value={category}
        />
        <Box>
          <Button
            disabled={!resumeId.trim() || !label.trim() || !category.trim()}
            isLoading={createVersion.isPending}
            onClick={() => void handleAdd()}
          >
            Approve version
          </Button>
        </Box>
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : !versions || versions.length === 0 ? (
        <Alert severity="info">No approved resume versions yet.</Alert>
      ) : (
        <Paper variant="outlined">
          {versions.map((version, index) => (
            <Box
              key={version.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderTop: index === 0 ? 'none' : '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600} variant="body2">
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
                aria-label="Delete resume version"
                onClick={() => void handleDelete(version.id)}
                size="small"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}
