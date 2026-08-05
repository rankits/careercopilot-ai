import type { ButtonHTMLAttributes, ReactNode } from 'react';

import googleBrandIcon from '@/assets/icons/google-brand.svg';
import { SOCIAL_CONNECT_LABELS } from '@/constants/ui';
import { LinkedInIcon, MuiButton } from '@/lib/material';

import { socialConnectButtonSx } from './styles';

type SocialProvider = 'google' | 'linkedin';

export interface SocialConnectButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'color' | 'type'
> {
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

export function SocialConnectButton({ provider, ...props }: SocialConnectButtonProps) {
  return (
    <MuiButton {...props} fullWidth type="button" sx={socialConnectButtonSx}>
      {providerIcons[provider]}
      <span>{SOCIAL_CONNECT_LABELS[provider]}</span>
    </MuiButton>
  );
}
