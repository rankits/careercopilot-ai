import type { ReactNode } from 'react';

import { MetricCardRoot, MetricHelper, MetricIcon, MetricLabel, MetricValue } from './styles';

export interface DashboardMetricCardProps {
  helper: string;
  icon: ReactNode;
  label: string;
  value: string;
}

export function DashboardMetricCard({ helper, icon, label, value }: DashboardMetricCardProps) {
  return (
    <MetricCardRoot>
      <MetricIcon>{icon}</MetricIcon>
      <div>
        <MetricValue>{value}</MetricValue>
        <MetricLabel>{label}</MetricLabel>
        <MetricHelper>{helper}</MetricHelper>
      </div>
    </MetricCardRoot>
  );
}
