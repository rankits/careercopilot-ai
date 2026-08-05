import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import {
  useConsents,
  useGrantConsent,
  useRevokeConsent,
} from '@/features/auto-apply/hooks/useConsents';

import type { ConsentType } from '@/features/auto-apply/types/autoApply.types';
import { Alert, Box, Chip, CircularProgress, Paper, Typography } from '@/lib/material';

const CONSENT_TYPES: {
  type: ConsentType;
  label: string;
  description: string;
  requiredForSetup?: boolean;
}[] = [
  {
    type: 'RESUME_USAGE',
    label: 'Use my resume on applications',
    description:
      'Lets Career Copilot attach the resume you approved when preparing an application. Without this, we cannot put your resume on a job for you — even for Assisted Apply.',
    requiredForSetup: true,
  },
  {
    type: 'CONTENT_GENERATION',
    label: 'Draft cover letters and answers for me',
    description:
      'Lets us suggest cover letters and screening answers based on your profile and the job. You always review and can edit before anything is used. Turn this off if you only want to write everything yourself.',
  },
  // EMAIL_SUBMISSION and AUTOPILOT_SUBMISSION are intentionally omitted (AA-002).
  // Those types remain in the ConsentType enum for Later automation but are not
  // grantable from the UI and are rejected by the grant API.
];

export function ConsentsTab() {
  const { data: consents, isLoading } = useConsents();
  const grantConsent = useGrantConsent();
  const revokeConsent = useRevokeConsent();
  const { showToast } = useToast();

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

  const handleRevoke = async (id: string) => {
    try {
      await revokeConsent.mutateAsync(id);
      showToast({ message: 'Permission turned off.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to turn off this permission.',
        severity: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 720 }}>
      <Typography color="text.secondary" variant="body2">
        These are permissions — not technical settings. Turn on only what you are comfortable with.
        You can change your mind anytime; turning something off takes effect immediately.
      </Typography>

      <Alert severity="info">
        To start Assisted Apply you need at least &quot;Use my resume on applications&quot;. Other
        permissions are optional until you use those features.
      </Alert>

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
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography fontWeight={600} variant="body2">
                    {item.label}
                  </Typography>
                  {item.requiredForSetup && (
                    <Chip color="warning" label="Required" size="small" variant="outlined" />
                  )}
                </Box>
                <Typography color="text.secondary" variant="body2">
                  {item.description}
                </Typography>
              </Box>
              <Chip
                color={active ? 'success' : 'default'}
                label={active ? 'On' : 'Off'}
                size="small"
                variant="outlined"
              />
              {active ? (
                <Button
                  isLoading={revokeConsent.isPending}
                  onClick={() => void handleRevoke(active.id)}
                  size="small"
                  tone="danger"
                  variant="outline"
                >
                  Turn off
                </Button>
              ) : (
                <Button
                  isLoading={grantConsent.isPending}
                  onClick={() => void handleGrant(item.type)}
                  size="small"
                >
                  Turn on
                </Button>
              )}
            </Box>
          );
        })}
      </Paper>
    </Box>
  );
}
