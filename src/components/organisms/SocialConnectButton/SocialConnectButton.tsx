import GoogleIcon from '@mui/icons-material/Google';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MuiButton from '@mui/material/Button';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { socialConnectButtonSx } from './styles';

type SocialProvider = 'google' | 'linkedin';

export interface SocialConnectButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'color' | 'type'
> {
  provider: SocialProvider;
}

const providerContent: Record<SocialProvider, { icon: ReactNode; label: string }> = {
  google: {
    icon: <GoogleIcon aria-hidden="true" color="primary" />,
    label: 'Continue with Google',
  },
  linkedin: {
    icon: <LinkedInIcon aria-hidden="true" color="primary" />,
    label: 'Continue with LinkedIn',
  },
};

export function SocialConnectButton({ provider, ...props }: SocialConnectButtonProps) {
  const content = providerContent[provider];

  return (
    <MuiButton {...props} fullWidth type="button" sx={socialConnectButtonSx}>
      {content.icon}
      <span>{content.label}</span>
    </MuiButton>
  );
}
