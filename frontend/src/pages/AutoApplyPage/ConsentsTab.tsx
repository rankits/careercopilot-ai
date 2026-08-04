import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import {
  useConsents,
  useGrantConsent,
  useRevokeConsent,
} from '@/features/auto-apply/hooks/useConsents';

import type { ConsentType } from '@/features/auto-apply/types/autoApply.types';
import { Box, Chip, CircularProgress, Paper, Typography } from '@/lib/material';

const CONSENT_TYPES: { type: ConsentType; label: string; description: string }[] = [
  {
    type: 'RESUME_USAGE',
    label: 'Use my approved resume',
    description: 'Allows the planner to attach an approved resume version to a plan.',
  },
  {
    type: 'CONTENT_GENERATION',
    label: 'Generate job-specific content',
    description: 'Allows AI-assisted cover letter / answer generation, once that capability ships.',
  },
  {
    type: 'EMAIL_SUBMISSION',
    label: 'Submit applications via my connected email',
    description: 'Required before any email-channel auto-apply can send on your behalf.',
  },
  {
    type: 'AUTOPILOT_SUBMISSION',
    label: 'Submit under autopilot rules',
    description: 'Required before full autopilot (Mode C) can act without per-application review.',
  },
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
      showToast({ message: 'Consent granted.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to grant consent.',
        severity: 'error',
      });
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeConsent.mutateAsync(id);
      showToast({ message: 'Consent revoked.', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to revoke consent.',
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
        Nothing is used, generated, or sent on your behalf without an active grant here — revoking
        takes effect immediately.
      </Typography>

      <Paper variant="outlined">
        {CONSENT_TYPES.map((item, index) => {
          const active = activeByType.get(item.type);
          return (
            <Box
              key={item.type}
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
                  {item.label}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {item.description}
                </Typography>
              </Box>
              <Chip
                color={active ? 'success' : 'default'}
                label={active ? 'Granted' : 'Not granted'}
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
                  Revoke
                </Button>
              ) : (
                <Button
                  isLoading={grantConsent.isPending}
                  onClick={() => void handleGrant(item.type)}
                  size="small"
                >
                  Grant
                </Button>
              )}
            </Box>
          );
        })}
      </Paper>
    </Box>
  );
}
