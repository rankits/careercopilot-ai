import type { SvgIconComponent } from '@mui/icons-material';

import type { IconTone } from '@/tokens';

export interface AuthPageFeature {
  description: string;
  icon: SvgIconComponent;
  title: string;
  tone: IconTone;
}
