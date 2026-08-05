import { useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import {
  useConsents,
  useGrantConsent,
  useRevokeConsent,
} from '@/features/auto-apply/hooks/useConsents';
import {
  usePrivacyAcknowledgement,
  useSavePrivacyAcknowledgement,
} from '@/features/auto-apply/hooks/usePrivacyAcknowledgement';
import { CURRENT_PRIVACY_POLICY_VERSION } from '@/features/auto-apply/constants/privacyPolicy';
import { setupTouchTargetSx } from '@/features/auto-apply/utils/setupFieldFocus';

import type { ConsentType } from '@/features/auto-apply/types/autoApply.types';
import {
  Alert,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  Paper,
  Typography,
} from '@/lib/material';

const CONSENT_TYPES: {
  type: ConsentType;
  label: string;
  description: string;
  requiredForSetup?: boolean;
  fieldId: string;
}[] = [
  {
    type: 'RESUME_USAGE',
    label: 'Use my resume to prepare applications',
    description:
      'Lets Career Copilot attach the resume you approved when preparing an application. Required before you can use Assisted Apply.',
    requiredForSetup: true,
    fieldId: 'resume-usage',
  },
  {
    type: 'CONTENT_GENERATION',
    label: 'Generate tailored content (cover letters, answers) with AI',
    description:
      'Optional. Lets us suggest cover letters and screening answers based on your profile and the job. You always review before anything is used.',
    fieldId: 'content-generation',
  },
];

function formatAcknowledgedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ConsentsTab() {
  const { data: consents, isLoading: consentsLoading } = useConsents();
  const { data: privacyAck, isLoading: privacyLoading } = usePrivacyAcknowledgement();
  const grantConsent = useGrantConsent();
  const revokeConsent = useRevokeConsent();
  const savePrivacyAck = useSavePrivacyAcknowledgement();
  const { showToast } = useToast();
  const [revokeTarget, setRevokeTarget] = useState<{ id: string } | null>(null);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  const activeByType = new Map(
    (consents ?? [])
      .filter((consent) => !consent.revokedAt)
      .map((consent) => [consent.consentType, consent]),
  );

  const handleGrant = async (type: ConsentType) => {
    try {
      await grantConsent.mutateAsync(type);
      showToast({ message: 'Permission saved.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to save this permission.',
        severity: 'error',
      });
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeConsent.mutateAsync(revokeTarget.id);
      showToast({ message: 'Permission turned off.', severity: 'success' });
      setRevokeTarget(null);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to turn off this permission.',
        severity: 'error',
      });
    }
  };

  const handleSavePrivacy = async () => {
    if (!privacyChecked) return;
    try {
      await savePrivacyAck.mutateAsync({ policyVersion: CURRENT_PRIVACY_POLICY_VERSION });
      showToast({ message: 'Privacy acknowledgement saved.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to save privacy acknowledgement.',
        severity: 'error',
      });
    }
  };

  if (consentsLoading || privacyLoading) {
    return (
      <Box aria-busy="true" aria-label="Loading consents" sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box
      aria-labelledby="setup-consents-heading"
      id="setup-section-consents"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 720 }}
    >
      <Typography color="text.secondary" variant="body2">
        Grant only the permissions you understand. You can revoke resume usage at any time — doing so
        blocks Assisted Apply until you grant it again.
      </Typography>

      <Paper variant="outlined">
        {CONSENT_TYPES.map((item, index) => {
          const active = activeByType.get(item.type);
          return (
            <Box
              key={item.type}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                p: 2,
                borderTop: index === 0 ? 'none' : '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box id={`setup-field-${item.fieldId}`} sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography fontWeight={600} variant="body2">
                    {item.label}
                  </Typography>
                  <Chip
                    color={item.requiredForSetup ? 'warning' : 'default'}
                    label={item.requiredForSetup ? 'Required' : 'Optional'}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Typography color="text.secondary" variant="body2">
                  {item.description}
                </Typography>
              </Box>
              <Chip
                aria-label={`${item.label} ${active ? 'on' : 'off'}`}
                color={active ? 'success' : 'default'}
                label={active ? 'On' : 'Off'}
                size="small"
                variant="outlined"
              />
              {active ? (
                <Button
                  aria-label={`Turn off ${item.label}`}
                  isLoading={revokeConsent.isPending}
                  onClick={() => {
                    if (item.type === 'RESUME_USAGE') {
                      setRevokeTarget({ id: active.id });
                      return;
                    }
                    void revokeConsent.mutateAsync(active.id);
                  }}
                  size="small"
                  sx={setupTouchTargetSx}
                  tone="danger"
                  variant="outline"
                >
                  Turn off
                </Button>
              ) : (
                <Button
                  aria-label={`Turn on ${item.label}`}
                  isLoading={grantConsent.isPending}
                  onClick={() => void handleGrant(item.type)}
                  size="small"
                  sx={setupTouchTargetSx}
                >
                  Turn on
                </Button>
              )}
            </Box>
          );
        })}
      </Paper>

      <Paper sx={{ p: 2 }} variant="outlined">
        <Typography component="h3" sx={{ mb: 1 }} variant="subtitle1">
          Privacy acknowledgement
        </Typography>
        {privacyAck ? (
          <Typography id="setup-field-privacy-acknowledgement" variant="body2">
            Acknowledged on {formatAcknowledgedDate(privacyAck.acknowledgedAt)}
          </Typography>
        ) : (
          <Box id="setup-field-privacy-acknowledgement">
            <FormControlLabel
              control={
                <Checkbox
                  checked={privacyChecked}
                  inputProps={{ 'aria-required': true }}
                  onChange={(event) => setPrivacyChecked(event.target.checked)}
                />
              }
              label={
                <>
                  I have read and agree to the{' '}
                  <Link href="/privacy" rel="noopener noreferrer" target="_blank">
                    Privacy Policy
                  </Link>
                </>
              }
            />
            <Box sx={{ mt: 1 }}>
              <Button
                disabled={!privacyChecked}
                isLoading={savePrivacyAck.isPending}
                onClick={() => void handleSavePrivacy()}
                sx={setupTouchTargetSx}
              >
                Save acknowledgement
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      <Dialog
        aria-describedby="revoke-resume-description"
        aria-labelledby="revoke-resume-title"
        fullWidth
        maxWidth="xs"
        onClose={() => !revokeConsent.isPending && setRevokeTarget(null)}
        open={Boolean(revokeTarget)}
      >
        <DialogTitle id="revoke-resume-title">Revoke resume usage?</DialogTitle>
        <DialogContent>
          <Typography id="revoke-resume-description" variant="body2">
            You won&apos;t be able to use Assisted Apply until you grant this again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={revokeConsent.isPending}
            onClick={() => setRevokeTarget(null)}
            sx={setupTouchTargetSx}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            isLoading={revokeConsent.isPending}
            onClick={() => void handleConfirmRevoke()}
            sx={setupTouchTargetSx}
            tone="danger"
          >
            Revoke
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
