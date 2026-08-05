import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MuiButton,
} from '@/lib/material';

export interface DiscardChangesDialogProps {
  open: boolean;
  body?: string;
  onDiscard: () => void;
  onKeepEditing: () => void;
}

export function DiscardChangesDialog({
  open,
  body = 'You have unsaved changes to your personal details.',
  onDiscard,
  onKeepEditing,
}: DiscardChangesDialogProps) {
  return (
    <Dialog aria-labelledby="discard-changes-title" onClose={onKeepEditing} open={open}>
      <DialogTitle id="discard-changes-title">Discard changes?</DialogTitle>
      <DialogContent>
        <DialogContentText>{body}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <MuiButton onClick={onKeepEditing}>Keep editing</MuiButton>
        <MuiButton color="error" onClick={onDiscard} variant="contained">
          Discard
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}
