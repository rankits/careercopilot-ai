import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAbandonApplication } from '@/features/auto-apply/hooks/useResumeHandoff';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/components/organisms/Toast/ToastContext';
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
} from '@/lib/material';

const REASONS: Array<{ code: string; label: string }> = [
  { code: 'NOT_INTERESTED', label: 'Not interested' },
  { code: 'TOO_MANY_REQUIREMENTS', label: 'Too many requirements' },
  { code: 'BROKEN_LINK', label: 'Broken link' },
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

  const handleConfirm = () => {
    if (!reasonCode) return;
    abandonMutation.mutate(
      { reasonCode, note: note.trim() || undefined },
      {
        onSuccess: () => {
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
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Stop tracking this application?</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1, minWidth: { sm: 360 } }}>
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
      <DialogActions>
        <MuiButton onClick={onClose}>Cancel</MuiButton>
        <MuiButton
          color="error"
          disabled={!reasonCode || abandonMutation.isPending}
          onClick={handleConfirm}
          variant="contained"
        >
          Abandon
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}
