import type { ReactNode } from 'react';

import type { IconTone } from '@/tokens';

import { MetricCardRoot, MetricHelper, MetricIcon, MetricLabel, MetricValue } from './styles';

export interface DashboardMetricCardProps {
  helper: string;
  icon: ReactNode;
  label: string;
  tone?: IconTone;
  value: string;
}

export function DashboardMetricCard({
  helper,
  icon,
  label,
  tone = 'primary',
  value,
}: DashboardMetricCardProps) {
  return (
    <MetricCardRoot>
      <MetricIcon tone={tone}>{icon}</MetricIcon>
      <div>
        <MetricValue>{value}</MetricValue>
        <MetricLabel>{label}</MetricLabel>
        <MetricHelper>{helper}</MetricHelper>
      </div>
    </MetricCardRoot>
  );
}
