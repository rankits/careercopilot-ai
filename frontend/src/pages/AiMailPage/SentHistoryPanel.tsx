import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { ROUTES } from '@/constants/routes';
import {
  useAiMailDeliveries,
  usePrepareAiMailFollowUp,
  useResolveAiMailDelivery,
  type AiMailDeliveryListItem,
} from '@/features/ai-mail';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  FormControl,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@/lib/material';

function statusLabel(item: AiMailDeliveryListItem): string {
  if (item.status === 'unknown') {
    if (item.userResolution === 'confirmed_sent') return 'Unknown (you confirmed sent)';
    if (item.userResolution === 'confirmed_not_sent') return 'Unknown (you confirmed not sent)';
    return 'Unknown — check Gmail Sent';
  }
  return item.status.replaceAll('_', ' ');
}

interface SentHistoryPanelProps {
  enabled: boolean;
  onOpenDraft: (draftId: string) => void;
}

export function SentHistoryPanel({ enabled, onOpenDraft }: SentHistoryPanelProps) {
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AiMailDeliveryListItem | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpStyle, setFollowUpStyle] = useState<
    'concise' | 'polite' | 'value_add' | 'check_in'
  >('concise');
  const [followUpInstruction, setFollowUpInstruction] = useState('');

  const deliveriesQuery = useAiMailDeliveries({ page, limit: 10 }, enabled);
  const resolveStatus = useResolveAiMailDelivery();
  const prepareFollowUp = usePrepareAiMailFollowUp();

  const items = deliveriesQuery.data?.items ?? [];
  const total = deliveriesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 10));

  const selectedDetail = useMemo(() => selected, [selected]);

  const handleResolve = async (resolution: 'confirmed_sent' | 'confirmed_not_sent') => {
    if (!selected) return;
    try {
      const updated = await resolveStatus.mutateAsync({
        deliveryId: selected.deliveryId,
        resolution,
      });
      setSelected(updated);
      showToast({ message: 'Delivery status updated.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to resolve status.',
        severity: 'error',
      });
    }
  };

  const handlePrepareFollowUp = async () => {
    if (!selected) return;
    try {
      const result = await prepareFollowUp.mutateAsync({
        deliveryId: selected.deliveryId,
        payload: {
          style: followUpStyle,
          additionalInstruction: followUpInstruction.trim() || undefined,
        },
      });
      setFollowUpOpen(false);
      if (result.warnings.length > 0) {
        showToast({
          message: result.warnings[0] ?? 'Follow-up created with warnings.',
          severity: 'warning',
        });
      } else {
        showToast({ message: 'Follow-up draft created.', severity: 'success' });
      }
      onOpenDraft(result.draft.id);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to prepare follow-up.',
        severity: 'error',
      });
    }
  };

  if (!enabled) {
    return (
      <Alert severity="info">
        Enable mail sending to view delivery history. Connect Google under{' '}
        <Button component={RouterLink} to={ROUTES.CONNECTED_ACCOUNTS} variant="ghost">
          Connected Accounts
        </Button>
        .
      </Alert>
    );
  }

  if (deliveriesQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading delivery history" size={28} />
      </Box>
    );
  }

  if (deliveriesQuery.isError) {
    return (
      <Alert severity="error">
        {deliveriesQuery.error?.message ?? 'Unable to load delivery history.'}
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <Alert severity="info">
        No emails sent yet. Mark a draft ready and use Send Email from Compose.
      </Alert>
    );
  }

  return (
    <>
      <Stack spacing={1.5} role="list" aria-label="Sent mail history">
        {items.map((item) => (
          <Box
            key={item.deliveryId}
            role="listitem"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 2,
            }}
          >
            <Stack
              alignItems={{ sm: 'center' }}
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              spacing={1.5}
            >
              <Box>
                <Typography fontWeight={700}>
                  {item.companyName || 'Company'} — {item.roleTitle || 'Role'}
                </Typography>
                <Typography color="text.secondary" fontSize={13}>
                  {item.recipientEmail}
                </Typography>
                <Typography fontSize={13} sx={{ mt: 0.5 }}>
                  {item.subject || 'No subject'}
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                  <Chip label={statusLabel(item)} size="small" variant="outlined" />
                  <Chip
                    label={`Via ${item.connectedAccountEmail ?? item.fromEmail}${
                      item.connectedAccountDisconnected ? ' (Disconnected)' : ''
                    }`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={
                      item.sentAt
                        ? new Date(item.sentAt).toLocaleString()
                        : new Date(item.createdAt).toLocaleString()
                    }
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => setSelected(item)} size="small" variant="outline">
                  View
                </Button>
                {(item.status === 'sent' ||
                  (item.status === 'unknown' && item.userResolution === 'confirmed_sent')) && (
                  <Button
                    onClick={() => {
                      setSelected(item);
                      setFollowUpOpen(true);
                    }}
                    size="small"
                  >
                    Prepare Follow-up
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>

      <Stack alignItems="center" direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
        <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} variant="ghost">
          Previous
        </Button>
        <Typography fontSize={13}>
          Page {page} of {totalPages}
        </Typography>
        <Button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} variant="ghost">
          Next
        </Button>
      </Stack>

      <Drawer
        anchor="right"
        onClose={() => setSelected(null)}
        open={Boolean(selectedDetail)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, p: 2.5 } }}
      >
        {selectedDetail && (
          <Stack spacing={1.5}>
            <Typography component="h2" fontWeight={700}>
              Delivery detail
            </Typography>
            <Typography fontSize={13}>
              <strong>Status:</strong> {statusLabel(selectedDetail)}
            </Typography>
            <Typography fontSize={13}>
              <strong>Sent through:</strong>{' '}
              {selectedDetail.connectedAccountEmail ?? selectedDetail.fromEmail}
              {selectedDetail.connectedAccountDisconnected ? ' (Disconnected)' : ''}
            </Typography>
            <Typography fontSize={13}>
              <strong>Recipient:</strong> {selectedDetail.recipientEmail}
            </Typography>
            <Typography fontSize={13}>
              <strong>Company / Role:</strong> {selectedDetail.companyName || '—'} /{' '}
              {selectedDetail.roleTitle || '—'}
            </Typography>
            <Typography fontSize={13}>
              <strong>Subject:</strong> {selectedDetail.subject || '—'}
            </Typography>
            <Typography fontSize={13}>
              <strong>Draft version:</strong> {selectedDetail.draftVersion}
            </Typography>
            <Typography fontSize={13}>
              <strong>Delivery ID:</strong> {selectedDetail.deliveryId}
            </Typography>
            {selectedDetail.status === 'unknown' && !selectedDetail.userResolution && (
              <Alert severity="warning">
                We could not confirm whether this message was sent. Check Gmail Sent before
                retrying.
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  <Button
                    isLoading={resolveStatus.isPending}
                    onClick={() => void handleResolve('confirmed_sent')}
                    size="small"
                  >
                    I checked — it was sent
                  </Button>
                  <Button
                    isLoading={resolveStatus.isPending}
                    onClick={() => void handleResolve('confirmed_not_sent')}
                    size="small"
                    variant="outline"
                  >
                    I checked — not sent
                  </Button>
                </Stack>
              </Alert>
            )}
            {selectedDetail.normalizedErrorCode && selectedDetail.status === 'failed' && (
              <Alert severity="error">
                Send failed ({selectedDetail.normalizedErrorCode}). Reconnect Google if needed.
                <Button
                  component={RouterLink}
                  sx={{ ml: 1 }}
                  to={ROUTES.CONNECTED_ACCOUNTS}
                  variant="ghost"
                >
                  Connected Accounts
                </Button>
              </Alert>
            )}
            <Button onClick={() => onOpenDraft(selectedDetail.draftId)} variant="outline">
              Open related draft
            </Button>
          </Stack>
        )}
      </Drawer>

      <Dialog onClose={() => setFollowUpOpen(false)} open={followUpOpen}>
        <DialogTitle>Prepare follow-up</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Suggested follow-up: 5–7 business days after initial outreach. This does not send email.
          </DialogContentText>
          {selected && (
            <Stack spacing={0.75} sx={{ mb: 2 }}>
              <Typography fontSize={13}>
                <strong>Previous:</strong> {selected.subject || '—'}
              </Typography>
              <Typography fontSize={13}>
                <strong>To:</strong> {selected.recipientEmail}
              </Typography>
            </Stack>
          )}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <TextField
              label="Follow-up tone"
              onChange={(e) => setFollowUpStyle(e.target.value as typeof followUpStyle)}
              select
              value={followUpStyle}
            >
              <MenuItem value="concise">Concise</MenuItem>
              <MenuItem value="polite">Polite</MenuItem>
              <MenuItem value="value_add">Value add</MenuItem>
              <MenuItem value="check_in">Check-in</MenuItem>
            </TextField>
          </FormControl>
          <TextField
            fullWidth
            label="Additional instruction (optional)"
            minRows={3}
            multiline
            onChange={(e) => setFollowUpInstruction(e.target.value)}
            value={followUpInstruction}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFollowUpOpen(false)} variant="ghost">
            Cancel
          </Button>
          <Button
            isLoading={prepareFollowUp.isPending}
            onClick={() => void handlePrepareFollowUp()}
          >
            Generate Follow-up
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
