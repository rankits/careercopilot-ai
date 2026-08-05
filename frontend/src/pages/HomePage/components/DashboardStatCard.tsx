import type { ReactNode } from 'react';

import { Skeleton } from '@/lib/material';
import type { IconTone } from '@/tokens';

import {
  StatCardRoot,
  StatHelper,
  StatIcon,
  StatLabel,
  StatMain,
  StatSparklineWrap,
  StatValue,
} from '../styles';

import { MiniSparkline } from './MiniSparkline';

export interface DashboardStatCardProps {
  helper: string;
  helperTone?: 'positive' | 'muted';
  icon: ReactNode;
  label: string;
  loading?: boolean;
  sparkline: number[];
  tone?: IconTone;
  value: string;
}

export function DashboardStatCard({
  helper,
  helperTone = 'muted',
  icon,
  label,
  loading = false,
  sparkline,
  tone = 'primary',
  value,
}: DashboardStatCardProps) {
  if (loading) {
    return (
      <StatCardRoot aria-busy="true" aria-label={`Loading ${label}`}>
        <Skeleton height={40} variant="circular" width={40} />
        <StatMain>
          <Skeleton height={28} width="40%" />
          <Skeleton height={18} width="55%" />
          <Skeleton height={16} width="70%" />
        </StatMain>
        <Skeleton height={28} width={72} />
      </StatCardRoot>
    );
  }

  return (
    <StatCardRoot>
      <StatIcon tone={tone}>{icon}</StatIcon>
      <StatMain>
        <StatValue>{value}</StatValue>
        <StatLabel>{label}</StatLabel>
        <StatHelper tone={helperTone}>{helper}</StatHelper>
      </StatMain>
      <StatSparklineWrap>
        <MiniSparkline label={`${label} trend`} points={sparkline} tone={tone} />
      </StatSparklineWrap>
    </StatCardRoot>
  );
}
