import type { SvgIconComponent } from '@/lib/material';
import type { IconTone } from '@/tokens';

export interface AuthPageFeature {
  description: string;
  icon: SvgIconComponent;
  title: string;
  tone: IconTone;
}
