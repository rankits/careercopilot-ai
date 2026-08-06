import type { IconTone } from '@/tokens';
import { iconToneTokens } from '@/tokens';

import { SparklineSvg } from '../styles';

export interface MiniSparklineProps {
  label: string;
  points: number[];
  tone?: IconTone;
}

export function MiniSparkline({ label, points, tone = 'primary' }: MiniSparklineProps) {
  const width = 72;
  const height = 28;
  const values = points.length > 0 ? points : [0, 0, 0, 0];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const stepX = width / Math.max(values.length - 1, 1);

  const path = values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <SparklineSvg aria-hidden="true" tone={tone} viewBox={`0 0 ${width} ${height}`}>
      <title>{label}</title>
      <path d={path} fill="none" stroke={iconToneTokens[tone].color} strokeWidth="2" />
    </SparklineSvg>
  );
}
