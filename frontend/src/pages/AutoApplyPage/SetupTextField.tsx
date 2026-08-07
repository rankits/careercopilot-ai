import type { SxProps, Theme } from '@mui/material/styles';
import TextField, { type TextFieldProps } from '@mui/material/TextField';

import { setupFieldSx } from './setupPageStyles';

/** Application Setup TextField with typography aligned to the shared Input atom. */
export function SetupTextField({ sx, ...props }: TextFieldProps) {
  const mergedSx: SxProps<Theme> = sx ? [setupFieldSx, sx] : setupFieldSx;
  return <TextField sx={mergedSx} {...props} />;
}
