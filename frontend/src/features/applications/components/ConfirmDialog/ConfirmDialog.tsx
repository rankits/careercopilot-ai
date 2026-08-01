import { Button } from '@/components/atoms/Button';

import {
  ArchiveOutlinedIcon,
  CloseIcon,
  DeleteOutlineIcon,
  UnarchiveOutlinedIcon,
} from '@/lib/material';

import {
  ConfirmApplicationDialog,
  ConfirmBody,
  ConfirmFooter,
  ConfirmHeader,
  ConfirmHeaderAccent,
  ConfirmHeaderMain,
  ConfirmIcon,
  ConfirmMessage,
  ConfirmTitle,
  CloseButton,
  type ConfirmDialogIntent,
} from './styles';

export interface ConfirmDialogProps {
  cancelLabel?: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  description: string;
  intent?: ConfirmDialogIntent;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}

const intentIcons = {
  archive: ArchiveOutlinedIcon,
  delete: DeleteOutlineIcon,
  restore: UnarchiveOutlinedIcon,
} as const;

export function ConfirmDialog({
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  description,
  intent = 'archive',
  isPending = false,
  onClose,
  onConfirm,
  open,
  title,
}: ConfirmDialogProps) {
  const Icon = intentIcons[intent];

  return (
    <ConfirmApplicationDialog
      aria-labelledby="confirm-dialog-title"
      fullWidth
      maxWidth={false}
      onClose={onClose}
      open={open}
    >
      <ConfirmHeaderAccent intent={intent} />

      <ConfirmHeader>
        <ConfirmHeaderMain>
          <ConfirmIcon intent={intent}>
            <Icon fontSize="inherit" />
          </ConfirmIcon>
          <ConfirmTitle id="confirm-dialog-title">{title}</ConfirmTitle>
        </ConfirmHeaderMain>
        <CloseButton aria-label="Close confirmation dialog" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </CloseButton>
      </ConfirmHeader>

      <ConfirmBody>
        <ConfirmMessage>{description}</ConfirmMessage>
      </ConfirmBody>

      <ConfirmFooter>
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
      </ConfirmFooter>
    </ConfirmApplicationDialog>
  );
}
