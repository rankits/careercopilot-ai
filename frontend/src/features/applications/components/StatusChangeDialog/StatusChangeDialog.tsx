import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { FilterDropdown } from '@/components/molecules';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useTransitionApplicationStatus } from '@/features/applications/hooks/useApplicationMutations';

import { applicationDetailStatusOptions } from '@/constants/pages/applicationDetail';
import type { ApiApplicationStatus } from '@/features/applications/types/application.types';

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
  FieldGroup,
  FieldLabel,
  FormGrid,
} from '../ApplicationDialog/styles';

export interface StatusChangeDialogProps {
  applicationId: string;
  currentStatus: ApiApplicationStatus;
  onClose: () => void;
  open: boolean;
}

export function StatusChangeDialog({
  applicationId,
  currentStatus,
  onClose,
  open,
}: StatusChangeDialogProps) {
  const { showToast } = useToast();
  const transitionStatus = useTransitionApplicationStatus(applicationId);
  const [toStatus, setToStatus] = useState<ApiApplicationStatus>(currentStatus);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setToStatus(currentStatus);
      setNote('');
    }
  }, [currentStatus, open]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    if (toStatus === currentStatus) {
      showToast({ message: 'Select a different status to continue.', severity: 'error' });
      return;
    }

    try {
      await transitionStatus.mutateAsync({
        note: note.trim() || undefined,
        toStatus,
      });
      showToast({ message: 'Application status updated', severity: 'success' });
      handleClose();
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to update status.',
        severity: 'error',
      });
    }
  };

  return (
    <ApplicationDialog
      aria-labelledby="status-change-title"
      fullWidth
      maxWidth={false}
      onClose={handleClose}
      open={open}
    >
      <DialogHeaderAccent />

      <DialogHeader>
        <DialogHeaderContent>
          <DialogTitleGroup>
            <DialogTitleText id="status-change-title">Change status</DialogTitleText>
            <DialogSubtitle>
              Move this application to the next stage in your pipeline.
            </DialogSubtitle>
          </DialogTitleGroup>
        </DialogHeaderContent>
        <CloseButton aria-label="Close status change dialog" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </CloseButton>
      </DialogHeader>

      <DialogBody>
        <FormGrid>
          <FilterDropdown
            fullWidth
            label="New status"
            onChange={(value) => setToStatus(value as ApiApplicationStatus)}
            options={applicationDetailStatusOptions}
            value={toStatus}
          />
        </FormGrid>

        <FieldGroup>
          <FieldLabel>Note (optional)</FieldLabel>
          <Input
            fullWidth
            multiline
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add context for this status change..."
            rows={3}
            size="small"
            value={note}
          />
        </FieldGroup>
      </DialogBody>

      <DialogFooter>
        <DialogFooterActions>
          <Button disabled={transitionStatus.isPending} onClick={handleClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={transitionStatus.isPending} onClick={() => void handleSubmit()}>
            {transitionStatus.isPending ? 'Updating...' : 'Update status'}
          </Button>
        </DialogFooterActions>
      </DialogFooter>
    </ApplicationDialog>
  );
}
