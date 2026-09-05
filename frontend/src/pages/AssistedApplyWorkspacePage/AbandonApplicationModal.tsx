import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useAbandonApplication } from '@/features/auto-apply/hooks/useResumeHandoff';

import { ROUTES } from '@/constants/routes';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MuiButton,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@/lib/material';
import { trackEvent } from '@/shared/analytics/trackEvent';

import { assistedApplyWorkspaceSx } from './styles';
import { assistedApplyTouchTargetSx } from './WorkspaceStickyActions';

const REASONS: Array<{ code: string; label: string }> = [
  { code: 'NOT_INTERESTED', label: 'Not interested' },
  { code: 'TOO_MANY_REQUIREMENTS', label: 'Too many requirements' },
  { code: 'BROKEN_LINK', label: 'Application page unavailable' },
  { code: 'JOB_CLOSED', label: 'Job closed' },
  { code: 'WILL_APPLY_LATER', label: 'Will apply later' },
  { code: 'OTHER', label: 'Other' },
];

export interface AbandonApplicationModalProps {
  jobApplicationId: string;
  open: boolean;
  onClose: () => void;
}

export function AbandonApplicationModal({
  jobApplicationId,
  open,
  onClose,
}: AbandonApplicationModalProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const abandonMutation = useAbandonApplication(jobApplicationId);
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) {
      setReasonCode('');
      setNote('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (!reasonCode) return;
    abandonMutation.mutate(
      { reasonCode, note: note.trim() || undefined },
      {
        onSuccess: () => {
          trackEvent('application_abandoned', {
            job_application_id: jobApplicationId,
            reasonCode,
          });
          onClose();
          showToast({ message: 'Application withdrawn.', severity: 'success' });
          void navigate(`${ROUTES.AUTO_APPLY}?tab=submissions`);
        },
        onError: (error) => {
          showToast({
            message: error instanceof Error ? error.message : 'Could not abandon application.',
            severity: 'error',
          });
        },
      },
    );
  };

  return (
    <Dialog aria-labelledby="abandon-title" fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle id="abandon-title">Stop tracking this application?</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1, minWidth: 0, width: '100%' }}>
          <Typography color="text.secondary" variant="body2">
            Career Copilot will stop tracking this job. This does not withdraw your application on
            the employer&apos;s website if you already applied there.
          </Typography>
          <RadioGroup onChange={(_e, value) => setReasonCode(value)} value={reasonCode}>
            {REASONS.map((reason) => (
              <FormControlLabel
                control={<Radio />}
                key={reason.code}
                label={reason.label}
                value={reason.code}
              />
            ))}
          </RadioGroup>
          <TextField
            fullWidth
            label="Note (optional)"
            multiline
            minRows={2}
            onChange={(e) => setNote(e.target.value)}
            value={note}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={assistedApplyWorkspaceSx.dialogActions}>
        <MuiButton
          fullWidth
          onClick={onClose}
          sx={{ ...assistedApplyTouchTargetSx, ...assistedApplyWorkspaceSx.fullWidthMobileButton }}
        >
          Cancel
        </MuiButton>
        <MuiButton
          color="error"
          disabled={!reasonCode || abandonMutation.isPending}
          fullWidth
          onClick={handleConfirm}
          sx={{ ...assistedApplyTouchTargetSx, ...assistedApplyWorkspaceSx.fullWidthMobileButton }}
          variant="contained"
        >
          Abandon
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}
