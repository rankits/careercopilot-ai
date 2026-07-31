import { Button } from '@/components/atoms/Button';

import { CloseIcon } from '@/lib/material';

import {
  ApplicationDialog,
  CloseButton,
  DialogBody,
  DialogFooter,
  DialogFooterActions,
  DialogHeader,
  DialogHeaderAccent,
  DialogHeaderContent,
  DialogSubtitle,
  DialogTitleGroup,
  DialogTitleText,
} from '../ApplicationDialog/styles';

export interface ConfirmDialogProps {
  cancelLabel?: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  description: string;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}

export function ConfirmDialog({
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  description,
  isPending = false,
  onClose,
  onConfirm,
  open,
  title,
}: ConfirmDialogProps) {
  return (
    <ApplicationDialog
      aria-labelledby="confirm-dialog-title"
      fullWidth
      maxWidth={false}
      onClose={onClose}
      open={open}
    >
      <DialogHeaderAccent />

      <DialogHeader>
        <DialogHeaderContent>
          <DialogTitleGroup>
            <DialogTitleText id="confirm-dialog-title">{title}</DialogTitleText>
            <DialogSubtitle>{description}</DialogSubtitle>
          </DialogTitleGroup>
        </DialogHeaderContent>
        <CloseButton aria-label="Close confirmation dialog" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </CloseButton>
      </DialogHeader>

      <DialogBody />

      <DialogFooter>
        <DialogFooterActions>
          <Button disabled={isPending} onClick={onClose} variant="outline">
            {cancelLabel}
          </Button>
          <Button
            disabled={isPending}
            onClick={() => void onConfirm()}
            tone={confirmVariant === 'danger' ? 'danger' : 'primary'}
          >
            {isPending ? 'Working...' : confirmLabel}
          </Button>
        </DialogFooterActions>
      </DialogFooter>
    </ApplicationDialog>
  );
}
