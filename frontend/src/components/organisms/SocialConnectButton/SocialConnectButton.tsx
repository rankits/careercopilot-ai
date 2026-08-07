import LinkedInIcon from '@mui/icons-material/LinkedIn';
import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import googleBrandIcon from '@/assets/icons/google-brand.svg';
import { SOCIAL_CONNECT_LABELS } from '@/constants/ui';
import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

import { socialConnectButtonSx } from './styles';

type SocialProvider = 'google' | 'linkedin';

export interface SocialConnectButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'color' | 'type'
> {
  comingSoon?: boolean;
  provider: SocialProvider;
}

const providerIcons: Record<SocialProvider, ReactNode> = {
  google: (
    <img
      alt=""
      aria-hidden="true"
      data-testid="GoogleBrandIcon"
      height="20"
      src={googleBrandIcon}
      width="20"
    />
  ),
  linkedin: <LinkedInIcon aria-hidden="true" color="primary" />,
};

export function SocialConnectButton({
  comingSoon = false,
  disabled,
  provider,
  ...props
}: SocialConnectButtonProps) {
  const isDisabled = Boolean(disabled || comingSoon);

  const sx: SxProps<Theme> = isDisabled
    ? {
      ...(socialConnectButtonSx as object),
      '&.Mui-disabled': {
        bgcolor: colorTokens.backgroundApp,
        borderColor: colorTokens.borderDefault,
        color: colorTokens.textSecondary,
        opacity: 0.72,
      },
    }
    : socialConnectButtonSx;

  return (
    <MuiButton
      {...props}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      fullWidth
      sx={sx}
      type="button"
    >
      {providerIcons[provider]}
      <Box alignItems="center" display="flex" gap={spacing[2]} justifyContent="space-between">
        <span>{SOCIAL_CONNECT_LABELS[provider]}</span>
        {comingSoon ? (
          <Chip
            label="Coming Soon"
            size="small"
            sx={{
              bgcolor: colorTokens.actionPrimarySurface,
              color: colorTokens.actionPrimary,
              fontSize: fontSize.xs,
              fontWeight: fontWeight.bold,
              height: '1.5rem',
            }}
          />
        ) : null}
      </Box>
    </MuiButton>
  );
}
